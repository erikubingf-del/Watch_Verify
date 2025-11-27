/**
 * Long-Term Memory System
 *
 * Stores and retrieves customer memories using vector embeddings.
 * Allows the AI to remember facts, preferences, and context across conversations.
 */

import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'
import { logInfo, logError } from '@/lib/logger'
import { randomUUID } from 'crypto'

export interface Memory {
    id: string
    fact: string
    source: string
    confidence: number
    createdAt: Date
    similarity?: number
}

/**
 * Add a new memory for a customer
 */
export async function addMemory(
    customerId: string,
    fact: string,
    source: 'conversation' | 'feedback' | 'manual' = 'conversation',
    confidence: number = 1.0
): Promise<Memory | null> {
    try {
        // Generate embedding for the fact
        const { embedding } = await generateEmbedding(fact)

        // Store in database
        // Note: Prisma doesn't support vector writes directly in create/update yet for Unsupported types
        // We have to use raw query to insert
        const id = randomUUID()
        const embeddingString = `[${embedding.join(',')}]`

        await prisma.$executeRaw`
      INSERT INTO customer_memories (id, "customerId", fact, source, confidence, embedding, "createdAt")
      VALUES (${id}, ${customerId}, ${fact}, ${source}, ${confidence}, ${embeddingString}::vector, NOW())
    `

        logInfo('memory', 'Added new memory', { customerId, fact })

        return {
            id,
            fact,
            source,
            confidence,
            createdAt: new Date(),
        }
    } catch (error: any) {
        logError('memory-add', error, { customerId, fact })
        return null
    }
}

/**
 * Search for relevant memories
 */
export async function searchMemories(
    customerId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7
): Promise<Memory[]> {
    try {
        const { embedding } = await generateEmbedding(query)
        const embeddingString = `[${embedding.join(',')}]`
        const distanceThreshold = 1 - threshold

        const results = (await prisma.$queryRawUnsafe(
            `
      SELECT
        id, fact, source, confidence, "createdAt",
        1 - (embedding <=> $1::vector) as similarity
      FROM customer_memories
      WHERE "customerId" = $2
      AND (embedding <=> $1::vector) < $3
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $4
      `,
            embeddingString,
            customerId,
            distanceThreshold,
            limit
        )) as any[]

        return results.map((row: any) => ({
            id: row.id,
            fact: row.fact,
            source: row.source,
            confidence: row.confidence,
            createdAt: row.createdAt,
            similarity: row.similarity,
        }))
    } catch (error: any) {
        logError('memory-search', error, { customerId, query })
        return []
    }
}

/**
 * Get all memories for a customer (recent first)
 */
export async function getRecentMemories(
    customerId: string,
    limit: number = 10
): Promise<Memory[]> {
    try {
        const memories = await prisma.customerMemory.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                fact: true,
                source: true,
                confidence: true,
                createdAt: true,
            }
        })

        return memories as Memory[]
    } catch (error: any) {
        logError('memory-recent', error, { customerId })
        return []
    }
}

/**
 * Consolidate memories (remove duplicates/contradictions) - Placeholder
 * This would typically involve an LLM pass to merge facts.
 */
export async function consolidateMemories(customerId: string): Promise<void> {
    // TODO: Implement memory consolidation
}
