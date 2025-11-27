/**
 * Semantic Search Engine (PostgreSQL + pgvector)
 *
 * Finds relevant catalog items using vector similarity search directly in the database.
 * Replaces the legacy in-memory Airtable implementation.
 */

import { generateEmbedding } from './embeddings'
import { PrismaClient } from '@prisma/client'
import { logInfo, PerformanceTimer } from './logger'

// Re-export for dashboard APIs
export { generateEmbedding } from './embeddings'

const prisma = new PrismaClient()

export interface SearchOptions {
  tenantId?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
  similarityThreshold?: number
  includeInactive?: boolean
}

export interface SearchResult {
  id: string
  title: string
  description: string
  category: string
  price?: number
  imageUrl?: string
  tags?: string[]
  delivery_options?: string
  similarity: number
  relevanceScore: number
}

export interface SearchResponse {
  results: SearchResult[]
  queryEmbedding: number[]
  totalSearched: number // Approximate in Postgres
  durationMs: number
}

/**
 * Search catalog using semantic similarity via pgvector
 */
export async function searchCatalog(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const timer = new PerformanceTimer()
  timer.start()

  const {
    tenantId,
    category,
    minPrice,
    maxPrice,
    limit = 5,
    similarityThreshold = 0.7, // Note: pgvector distance is 0..2 (0=identical). Similarity = 1 - (distance/2) roughly? No, usually 1 - distance for cosine.
    // pgvector cosine distance (<=>) returns 1 - cosine_similarity.
    // So distance 0.3 means similarity 0.7.
    // We want similarity > threshold, so distance < (1 - threshold).
    includeInactive = false,
  } = options

  // Step 1: Generate embedding for search query
  logInfo('semantic-search', 'Starting semantic search (Postgres)', { query, options })
  const { embedding: queryEmbedding } = await generateEmbedding(query)

  // Step 2: Execute raw SQL query with pgvector
  // We use raw query because Prisma doesn't fully support vector operations in the typed API yet

  const distanceThreshold = 1 - similarityThreshold
  const vectorString = `[${queryEmbedding.join(',')}]`

  try {
    // Build dynamic filters
    const conditions: string[] = []
    const params: any[] = []

    // 1. Vector similarity (always applied)
    // We select it in the field list, but we can also filter by it

    if (tenantId) {
      conditions.push(`"tenantId" = $${params.length + 1}`)
      params.push(tenantId)
    }

    if (category) {
      conditions.push(`category = $${params.length + 1}`)
      params.push(category)
    }

    if (minPrice !== undefined) {
      conditions.push(`price >= $${params.length + 1}`)
      params.push(minPrice)
    }

    if (maxPrice !== undefined) {
      conditions.push(`price <= $${params.length + 1}`)
      params.push(maxPrice)
    }

    if (!includeInactive) {
      conditions.push(`"isActive" = true`)
    }

    // Add embedding check
    conditions.push(`embedding IS NOT NULL`)

    // Add distance threshold check
    // embedding <=> vector < threshold
    conditions.push(`(embedding <=> $${params.length + 1}::vector) < ${distanceThreshold}`)
    params.push(vectorString)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const querySql = `
      SELECT 
        id, 
        title, 
        description, 
        category, 
        price, 
        tags, 
        metadata, 
        1 - (embedding <=> $${params.length}::vector) as similarity
      FROM products
      ${whereClause}
      ORDER BY embedding <=> $${params.length}::vector ASC
      LIMIT ${limit};
    `

    const resultsRaw = (await prisma.$queryRawUnsafe(querySql, ...params)) as any[]

    // Map results
    const results: SearchResult[] = resultsRaw.map((row: any) => {
      const metadata = row.metadata || {}
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        price: Number(row.price),
        imageUrl: metadata.image_url,
        tags: row.tags,
        delivery_options: metadata.delivery_options,
        similarity: row.similarity,
        relevanceScore: row.similarity * 100, // Simple mapping for now
      }
    })

    const durationMs = timer.elapsed()

    logInfo('semantic-search-complete', 'Semantic search completed (Postgres)', {
      resultsFound: results.length,
      durationMs,
    })

    return {
      results,
      queryEmbedding,
      totalSearched: -1, // Not easily available in filtered vector search
      durationMs,
    }

  } catch (error: any) {
    logInfo('semantic-search-error', 'Postgres search failed', { error: error.message })
    throw error
  }
}

/**
 * Find similar items to a given catalog item
 */
export async function findSimilarItems(
  itemId: string,
  tenantId?: string,
  limit: number = 5
): Promise<SearchResult[]> {
  // Use raw query to get embedding of source item (Prisma doesn't support vector type in select)
  const sourceRaw = await prisma.$queryRaw`
    SELECT embedding::text, category FROM products WHERE id = ${itemId}
  ` as any[]

  if (!sourceRaw || sourceRaw.length === 0) {
    throw new Error(`Item ${itemId} not found`)
  }

  const sourceEmbeddingStr = sourceRaw[0].embedding
  // sourceEmbeddingStr is "[0.1, 0.2, ...]" string

  // Now search using this vector
  const querySql = `
    SELECT 
      id, title, description, category, price, tags, metadata,
      1 - (embedding <=> ${sourceEmbeddingStr}::vector) as similarity
    FROM products
    WHERE id != ${itemId}
    AND "tenantId" = ${tenantId ? `'${tenantId}'` : '"tenantId"'}
    AND category = '${sourceRaw[0].category}'
    ORDER BY embedding <=> ${sourceEmbeddingStr}::vector ASC
    LIMIT ${limit};
  `

  // Note: This is vulnerable to SQL injection if tenantId is not sanitized, but we use it internally.
  // Better to use parameterized query.

  const resultsRaw = (await prisma.$queryRawUnsafe(
    `
    SELECT
      id, title, description, category, price, tags, metadata,
      1 - (embedding <=> $1::vector) as similarity
    FROM products
    WHERE id != $2
    ${tenantId ? 'AND "tenantId" = $3' : ''}
    AND category = $4
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $5;
    `,
    sourceEmbeddingStr,
    itemId,
    ...(tenantId ? [tenantId] : []),
    sourceRaw[0].category,
    limit
  )) as any[]

  return resultsRaw.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    imageUrl: row.metadata?.image_url,
    tags: row.tags,
    similarity: row.similarity,
    relevanceScore: row.similarity * 100,
  }))
}
