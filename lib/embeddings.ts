/**
 * OpenAI Embeddings Utility
 *
 * Generates and manages text embeddings for semantic search.
 * Uses OpenAI text-embedding-3-small model (1536 dimensions, $0.00002/1K tokens)
 */

import { logError, logInfo } from './logger'


const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536 // text-embedding-3-small

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  totalTokens: number
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float', // Returns array of floats
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI embeddings API error (${response.status}): ${error}`)
    }

    const data = await response.json()

    return {
      embedding: data.data[0].embedding,
      tokens: data.usage.total_tokens,
    }
  } catch (error: any) {
    logError('generate-embedding', error, { text: text.substring(0, 100) })
    throw error
  }
}

/**
 * Generate embeddings for multiple texts in a single API call (more efficient)
 * Supports up to 2048 inputs per request
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  if (texts.length === 0) {
    return { embeddings: [], totalTokens: 0 }
  }

  if (texts.length > 2048) {
    throw new Error('Maximum 2048 texts per batch')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
        encoding_format: 'float',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI embeddings API error (${response.status}): ${error}`)
    }

    const data = await response.json()

    // Sort by index to ensure correct order
    const sortedData = data.data.sort((a: any, b: any) => a.index - b.index)

    return {
      embeddings: sortedData.map((item: any) => item.embedding),
      totalTokens: data.usage.total_tokens,
    }
  } catch (error: any) {
    logError('generate-batch-embeddings', error, { count: texts.length })
    throw error
  }
}

/**
 * Prepare text for embedding by combining relevant fields
 * This creates a rich, searchable representation of catalog items
 */
export function prepareCatalogText(item: {
  title: string
  description: string
  category?: string
  tags?: string[]
  price?: number
}): string {
  const parts: string[] = []

  // Title (most important)
  parts.push(item.title)

  // Category
  if (item.category) {
    parts.push(`Categoria: ${item.category}`)
  }

  // Tags
  if (item.tags && item.tags.length > 0) {
    parts.push(`Tags: ${item.tags.join(', ')}`)
  }

  // Description
  parts.push(item.description)

  // Price (helps with budget queries)
  if (item.price) {
    parts.push(`Preço: R$ ${item.price.toLocaleString('pt-BR')}`)
  }

  return parts.join('\n')
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    magnitudeA += vecA[i] * vecA[i]
    magnitudeB += vecB[i] * vecB[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}



/**
 * Restore embedding from base64 string
 */
export function base64ToEmbedding(base64: string): number[] {
  const bytes = Buffer.from(base64, 'base64')
  const buffer = new Float32Array(bytes.buffer)
  return Array.from(buffer)
}

/**
 * Calculate embedding cost for given token count
 * text-embedding-3-small: $0.00002 per 1K tokens
 */
export function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1000) * 0.00002
}

/**
 * Estimate tokens for text (rough approximation)
 * Actual tokenization varies, but this is ~75% accurate
 */
export function estimateTokens(text: string): number {
  // Roughly 4 characters = 1 token for English/Portuguese
  return Math.ceil(text.length / 4)
}

/**
 * Log embedding operation summary
 */
export function logEmbeddingOperation(
  operation: string,
  count: number,
  tokens: number,
  durationMs: number
) {
  const cost = calculateEmbeddingCost(tokens)
  logInfo('embeddings', `${operation} completed`, {
    operation,
    count,
    tokens,
    cost: `$${cost.toFixed(6)}`,
    durationMs,
    tokensPerSec: Math.round((tokens / durationMs) * 1000),
  })
}
