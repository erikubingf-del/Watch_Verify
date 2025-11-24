/**
 * Customer Facts - Vector-based Long-term Memory System
 *
 * Stores and retrieves stable facts about customers using semantic similarity.
 * Facts are extracted from conversations and embedded for efficient retrieval.
 */

import { atSelect, atCreate, atUpdate } from '@/utils/airtable'
import { logInfo, logError } from './logger'
import { chat } from './openai'

export interface CustomerFact {
  id?: string
  customer_phone: string
  tenant_id: string
  fact: string
  fact_embedding?: number[]
  category: 'preference' | 'constraint' | 'profile' | 'history' | 'budget'
  confidence: number // 0-1 score
  created_at: string
  last_confirmed?: string
  source_message?: string
}

/**
 * Extract stable facts from conversation messages
 * Uses GPT-4 to identify facts worth remembering long-term
 */
export async function extractFacts(
  messages: Array<{ direction: 'inbound' | 'outbound'; body: string; created_at: string }>,
  tenantId: string,
  customerPhone: string
): Promise<CustomerFact[]> {
  if (messages.length === 0) return []

  // Build conversation text
  const conversationText = messages
    .map(m => {
      const speaker = m.direction === 'inbound' ? 'Customer' : 'Assistant'
      return `${speaker}: ${m.body}`
    })
    .join('\n')

  try {
    const extractionPrompt = `You are a fact extraction system for a luxury watch CRM.

CONVERSATION:
${conversationText}

TASK: Extract STABLE FACTS about the customer that are worth remembering long-term.

RULES:
- ONLY extract facts that are stable and lasting (not temporary)
- IGNORE: greetings, "ok", "thanks", small talk, temporary requests
- INCLUDE: preferences, budget, style, constraints, personal info, past purchases
- Each fact should be a single, clear statement
- Assign category: preference | constraint | profile | history | budget
- Assign confidence: 0.0-1.0 (how certain you are this is a stable fact)

OUTPUT FORMAT (JSON array):
[
  {
    "fact": "Prefers Rolex sports models",
    "category": "preference",
    "confidence": 0.9,
    "source_message": "Quero um relógio esportivo Rolex"
  },
  {
    "fact": "Budget range: R$ 50,000 - R$ 60,000",
    "category": "budget",
    "confidence": 0.85,
    "source_message": "Tenho entre 50 e 60 mil para investir"
  }
]

If NO stable facts found, return empty array: []

Extract facts now (JSON only, no explanation):`

    const response = await chat(
      [
        {
          role: 'system',
          content: 'You are a fact extraction system. Output valid JSON only.',
        },
        { role: 'user', content: extractionPrompt },
      ],
      0.3 // Low temperature for deterministic extraction
    )

    // Parse JSON response
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const extractedFacts = JSON.parse(cleanedResponse)

    if (!Array.isArray(extractedFacts)) {
      logError('fact-extraction-invalid-format', new Error('Response not array'), {
        response: cleanedResponse.substring(0, 200),
      })
      return []
    }

    // Convert to CustomerFact format
    const facts: CustomerFact[] = extractedFacts.map((f: any) => ({
      customer_phone: customerPhone,
      tenant_id: tenantId,
      fact: f.fact,
      category: f.category || 'profile',
      confidence: f.confidence || 0.5,
      created_at: new Date().toISOString(),
      source_message: f.source_message,
    }))

    logInfo('facts-extracted', `Extracted ${facts.length} facts from ${messages.length} messages`, {
      phone: customerPhone,
      factsCount: facts.length,
      categories: facts.map(f => f.category),
    })

    return facts
  } catch (error: any) {
    logError('fact-extraction-failed', error, {
      phone: customerPhone,
      messagesCount: messages.length,
    })
    return []
  }
}

/**
 * Generate embedding for a text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    })

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error: any) {
    logError('embedding-generation-failed', error, { text: text.substring(0, 50) })
    throw error
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Save facts to CustomerFacts table with embeddings
 */
export async function saveFacts(facts: CustomerFact[]): Promise<void> {
  if (facts.length === 0) return

  try {
    for (const fact of facts) {
      // Generate embedding for the fact
      const embedding = await generateEmbedding(fact.fact)

      // Save to Airtable
      await atCreate('CustomerFacts', {
        customer_phone: fact.customer_phone,
        tenant_id: [fact.tenant_id], // Linked record
        fact: fact.fact,
        fact_embedding: JSON.stringify(embedding), // Store as JSON string
        category: fact.category,
        confidence: fact.confidence,
        created_at: fact.created_at,
        source_message: fact.source_message || '',
      } as any)

      logInfo('fact-saved', 'Fact saved to CustomerFacts', {
        phone: fact.customer_phone,
        fact: fact.fact.substring(0, 50),
        category: fact.category,
      })
    }
  } catch (error: any) {
    logError('fact-save-failed', error, {
      factsCount: facts.length,
    })
  }
}

/**
 * Search for relevant customer facts using vector similarity
 */
export async function searchCustomerFacts(
  tenantId: string,
  customerPhone: string,
  query: string,
  topK: number = 5
): Promise<CustomerFact[]> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Fetch all facts for this customer
    const records = await atSelect('CustomerFacts', {
      filterByFormula: `AND({customer_phone}='${customerPhone}', {tenant_id}='${tenantId}')`,
    })

    if (records.length === 0) {
      logInfo('no-facts-found', 'No facts in database for customer', {
        phone: customerPhone,
      })
      return []
    }

    // Calculate similarity scores
    const factsWithScores = records
      .map((record: any) => {
        const fields = record.fields
        const factEmbedding = JSON.parse(fields.fact_embedding || '[]')

        if (factEmbedding.length === 0) return null

        const similarity = cosineSimilarity(queryEmbedding, factEmbedding)

        return {
          id: record.id,
          customer_phone: fields.customer_phone,
          tenant_id: tenantId,
          fact: fields.fact,
          category: fields.category,
          confidence: fields.confidence,
          created_at: fields.created_at,
          last_confirmed: fields.last_confirmed,
          source_message: fields.source_message,
          similarity,
        }
      })
      .filter((f): f is CustomerFact & { similarity: number } => f !== null)

    // Sort by similarity (highest first)
    factsWithScores.sort((a, b) => b.similarity - a.similarity)

    // Return top K results
    const topFacts = factsWithScores.slice(0, topK)

    logInfo('facts-search-complete', `Found ${topFacts.length} relevant facts`, {
      phone: customerPhone,
      query: query.substring(0, 50),
      topSimilarity: topFacts[0]?.similarity.toFixed(3),
    })

    return topFacts.map(({ similarity, ...fact }) => fact)
  } catch (error: any) {
    logError('fact-search-failed', error, {
      phone: customerPhone,
      query: query.substring(0, 50),
    })
    return []
  }
}

/**
 * Extract and save facts from recent messages
 * Called after conversation ends or every N messages
 */
export async function processConversationForFacts(
  tenantId: string,
  customerPhone: string,
  messageLimit: number = 10
): Promise<number> {
  try {
    // Fetch recent messages
    const messages = await atSelect('Messages', {
      filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${customerPhone}', {deleted_at}=BLANK())`,
      sort: '[{"field":"created_at","direction":"desc"}]',
      maxRecords: String(messageLimit),
    })

    if (messages.length === 0) return 0

    // Convert to format for extraction
    const conversationMessages = messages.reverse().map((msg: any) => ({
      direction: msg.fields.direction,
      body: msg.fields.body || '',
      created_at: msg.fields.created_at,
    }))

    // Extract facts
    const facts = await extractFacts(conversationMessages, tenantId, customerPhone)

    if (facts.length === 0) {
      logInfo('no-facts-extracted', 'No stable facts found in conversation', {
        phone: customerPhone,
        messagesAnalyzed: conversationMessages.length,
      })
      return 0
    }

    // Save facts with embeddings
    await saveFacts(facts)

    logInfo('conversation-facts-processed', `Processed conversation and saved ${facts.length} facts`, {
      phone: customerPhone,
      messagesAnalyzed: conversationMessages.length,
      factsSaved: facts.length,
    })

    return facts.length
  } catch (error: any) {
    logError('conversation-fact-processing-failed', error, {
      phone: customerPhone,
    })
    return 0
  }
}
