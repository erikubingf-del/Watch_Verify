/**
 * Semantic Search Engine
 *
 * Finds relevant catalog items using vector similarity search.
 * Combines semantic matching with optional filters (category, price range, tenant).
 */

import { generateEmbedding, cosineSimilarity, base64ToEmbedding } from './embeddings'
import { atSelect } from '@/utils/airtable'
import { logInfo, logWarn, PerformanceTimer } from './logger'

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
  similarity: number
  relevanceScore: number
}

export interface SearchResponse {
  results: SearchResult[]
  queryEmbedding: number[]
  totalSearched: number
  durationMs: number
}

/**
 * Search catalog using semantic similarity
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
    similarityThreshold = 0.7,
    includeInactive = false,
  } = options

  // Step 1: Generate embedding for search query
  logInfo('semantic-search', { query, options })
  const { embedding: queryEmbedding } = await generateEmbedding(query)

  // Step 2: Build Airtable filter
  const filters: string[] = []

  if (tenantId) {
    filters.push(`{tenant_id}='${tenantId}'`)
  }

  if (category) {
    filters.push(`{category}='${category}'`)
  }

  if (minPrice !== undefined) {
    filters.push(`{price}>=${minPrice}`)
  }

  if (maxPrice !== undefined) {
    filters.push(`{price}<=${maxPrice}`)
  }

  if (!includeInactive) {
    filters.push(`{active}=TRUE()`)
  }

  // Must have embedding to be searchable
  filters.push(`{embedding}!=''`)

  const filterFormula = filters.length > 0 ? `AND(${filters.join(',')})` : ''

  // Step 3: Fetch all matching catalog items
  const records = await atSelect<CatalogRecord>('Catalog', {
    ...(filterFormula && { filterByFormula: filterFormula }),
  })

  logInfo('semantic-search-fetch', {
    recordsFetched: records.length,
    filterApplied: !!filterFormula,
  })

  if (records.length === 0) {
    return {
      results: [],
      queryEmbedding,
      totalSearched: 0,
      durationMs: timer.elapsed(),
    }
  }

  // Step 4: Calculate similarity scores
  const scoredResults: Array<SearchResult & { similarity: number }> = []

  for (const record of records) {
    try {
      // Skip records without embeddings
      if (!record.fields.embedding) {
        logWarn('semantic-search', `Record ${record.id} missing embedding`, {
          title: record.fields.title,
        })
        continue
      }

      // Restore embedding from base64
      const itemEmbedding = base64ToEmbedding(record.fields.embedding)

      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryEmbedding, itemEmbedding)

      // Skip if below threshold
      if (similarity < similarityThreshold) {
        continue
      }

      // Calculate relevance score (combines similarity with other factors)
      const relevanceScore = calculateRelevanceScore(
        similarity,
        record.fields,
        query
      )

      scoredResults.push({
        id: record.id,
        title: record.fields.title,
        description: record.fields.description,
        category: record.fields.category,
        price: record.fields.price,
        imageUrl: record.fields.image_url,
        tags: record.fields.tags,
        similarity,
        relevanceScore,
      })
    } catch (error: any) {
      logWarn('semantic-search-scoring', `Error scoring record ${record.id}`, {
        error: error.message,
      })
    }
  }

  // Step 5: Sort by relevance score and limit results
  const results = scoredResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)

  const durationMs = timer.elapsed()

  logInfo('semantic-search-complete', {
    resultsFound: results.length,
    totalSearched: records.length,
    durationMs,
    avgSimilarity:
      results.length > 0
        ? (results.reduce((sum, r) => sum + r.similarity, 0) / results.length).toFixed(3)
        : 0,
  })

  return {
    results,
    queryEmbedding,
    totalSearched: records.length,
    durationMs,
  }
}

/**
 * Calculate relevance score combining multiple signals
 */
function calculateRelevanceScore(
  similarity: number,
  item: CatalogFields,
  query: string
): number {
  let score = similarity * 100 // Base score from semantic similarity (0-100)

  // Boost if query contains exact title words
  const queryWords = query.toLowerCase().split(/\s+/)
  const titleWords = item.title.toLowerCase().split(/\s+/)

  const exactMatches = queryWords.filter((word) =>
    titleWords.some((titleWord) => titleWord.includes(word) || word.includes(titleWord))
  ).length

  if (exactMatches > 0) {
    score += exactMatches * 5 // +5 per exact word match
  }

  // Boost if category mentioned in query
  if (item.category && query.toLowerCase().includes(item.category.toLowerCase())) {
    score += 10
  }

  // Boost if tags match query
  if (item.tags) {
    const tagMatches = item.tags.filter((tag) =>
      query.toLowerCase().includes(tag.toLowerCase())
    ).length

    if (tagMatches > 0) {
      score += tagMatches * 3 // +3 per tag match
    }
  }

  return score
}

/**
 * Find similar items to a given catalog item
 */
export async function findSimilarItems(
  itemId: string,
  tenantId?: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const timer = new PerformanceTimer()
  timer.start()

  // Fetch the source item
  const sourceRecords = await atSelect<CatalogRecord>('Catalog', {
    filterByFormula: `RECORD_ID()='${itemId}'`,
  })

  if (sourceRecords.length === 0) {
    throw new Error(`Catalog item ${itemId} not found`)
  }

  const sourceItem = sourceRecords[0]

  if (!sourceItem.fields.embedding) {
    throw new Error(`Item ${itemId} has no embedding`)
  }

  const sourceEmbedding = base64ToEmbedding(sourceItem.fields.embedding)

  // Search for similar items (excluding the source item)
  const filters: string[] = [`RECORD_ID()!='${itemId}'`, `{embedding}!=''`]

  if (tenantId) {
    filters.push(`{tenant_id}='${tenantId}'`)
  }

  // Prefer same category
  if (sourceItem.fields.category) {
    filters.push(`{category}='${sourceItem.fields.category}'`)
  }

  const filterFormula = `AND(${filters.join(',')})`

  const records = await atSelect<CatalogRecord>('Catalog', {
    filterByFormula: filterFormula,
  })

  // Calculate similarities
  const scoredResults: SearchResult[] = []

  for (const record of records) {
    if (!record.fields.embedding) continue

    const itemEmbedding = base64ToEmbedding(record.fields.embedding)
    const similarity = cosineSimilarity(sourceEmbedding, itemEmbedding)

    scoredResults.push({
      id: record.id,
      title: record.fields.title,
      description: record.fields.description,
      category: record.fields.category,
      price: record.fields.price,
      imageUrl: record.fields.image_url,
      tags: record.fields.tags,
      similarity,
      relevanceScore: similarity * 100,
    })
  }

  // Sort by similarity and limit
  const results = scoredResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  logInfo('find-similar', {
    sourceItem: sourceItem.fields.title,
    resultsFound: results.length,
    durationMs: timer.elapsed(),
  })

  return results
}

/**
 * Get trending or popular items (fallback when semantic search doesn't apply)
 */
export async function getTrendingItems(
  tenantId?: string,
  category?: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const filters: string[] = [`{active}=TRUE()`]

  if (tenantId) {
    filters.push(`{tenant_id}='${tenantId}'`)
  }

  if (category) {
    filters.push(`{category}='${category}'`)
  }

  const filterFormula = filters.length > 0 ? `AND(${filters.join(',')})` : ''

  const records = await atSelect<CatalogRecord>('Catalog', {
    ...(filterFormula && { filterByFormula: filterFormula }),
    sort: [{ field: 'created_at', direction: 'desc' }],
    maxRecords: limit,
  })

  return records.map((record) => ({
    id: record.id,
    title: record.fields.title,
    description: record.fields.description,
    category: record.fields.category,
    price: record.fields.price,
    imageUrl: record.fields.image_url,
    tags: record.fields.tags,
    similarity: 0,
    relevanceScore: 0,
  }))
}

// Type definitions
interface CatalogFields {
  tenant_id: string
  title: string
  description: string
  category: string
  price?: number
  image_url?: string
  tags?: string[]
  embedding?: string // base64 encoded
  active: boolean
  created_at?: string
}

type CatalogRecord = {
  id: string
  fields: CatalogFields
}
