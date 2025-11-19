/**
 * RAG (Retrieval Augmented Generation) Context Builder
 *
 * Enhances AI responses with relevant catalog information.
 * Searches catalog semantically and formats results as context for GPT-4.
 */

import { searchCatalog, SearchResult, SearchOptions } from './semantic-search'
import { logInfo } from './logger'
import { atSelect } from '@/utils/airtable'

export interface RAGContext {
  systemPrompt: string
  relevantProducts: SearchResult[]
  searchPerformed: boolean
  conversationContext?: string
}

export interface RAGOptions {
  tenantId?: string
  customerPhone?: string
  includeConversationHistory?: boolean
  maxHistoryMessages?: number
  searchOptions?: SearchOptions
}

/**
 * Build RAG context for AI response
 * Combines semantic search results with conversation history
 */
export async function buildRAGContext(
  userMessage: string,
  options: RAGOptions = {}
): Promise<RAGContext> {
  const {
    tenantId,
    customerPhone,
    includeConversationHistory = true,
    maxHistoryMessages = 10,
    searchOptions = {},
  } = options

  // Step 1: Semantic search for relevant products
  let relevantProducts: SearchResult[] = []
  let searchPerformed = false

  // Only search if message seems product-related
  if (shouldPerformSearch(userMessage)) {
    try {
      const searchResponse = await searchCatalog(userMessage, {
        tenantId,
        limit: 5,
        similarityThreshold: 0.65, // Lower threshold for broader matches
        ...searchOptions,
      })

      relevantProducts = searchResponse.results
      searchPerformed = true

      logInfo('rag-search', 'Semantic search completed', {
        query: userMessage,
        resultsFound: relevantProducts.length,
        topSimilarity: relevantProducts[0]?.similarity.toFixed(3) || 0,
      })
    } catch (error: any) {
      logInfo('rag-search-skip', 'Semantic search skipped', { reason: error.message })
    }
  }

  // Step 2: Build conversation context (optional)
  let conversationContext = ''

  if (includeConversationHistory && customerPhone && tenantId) {
    conversationContext = await buildConversationContext(
      tenantId,
      customerPhone,
      maxHistoryMessages
    )
  }

  // Step 3: Build system prompt with catalog context
  const systemPrompt = buildSystemPrompt(relevantProducts, conversationContext)

  return {
    systemPrompt,
    relevantProducts,
    searchPerformed,
    conversationContext,
  }
}

/**
 * Determine if user message warrants catalog search
 */
function shouldPerformSearch(message: string): boolean {
  const lowerMessage = message.toLowerCase()

  // Skip if message is too short
  if (message.trim().length < 5) {
    return false
  }

  // Skip greetings and common non-product queries
  const skipPatterns = [
    /^(oi|olá|bom dia|boa tarde|boa noite|hello|hi)\b/i,
    /^(obrigad|thanks|valeu)/i,
    /^(sim|não|ok|tudo bem)/i,
    /\b(como está|tudo bem|tudo certo)\b/i,
  ]

  if (skipPatterns.some((pattern) => pattern.test(message))) {
    return false
  }

  // Perform search if message contains product-related keywords
  const productKeywords = [
    // Watch brands
    'rolex',
    'patek',
    'philippe',
    'audemars',
    'piguet',
    'omega',
    'cartier',
    'iwc',
    'breitling',
    'tag',
    'heuer',
    'panerai',
    'hublot',
    'vacheron',
    'constantin',
    // Watch types
    'relógio',
    'relogio',
    'watch',
    'cronógrafo',
    'cronografo',
    'automático',
    'automatico',
    'diver',
    'mergulho',
    // Jewelry
    'anel',
    'ring',
    'colar',
    'necklace',
    'pulseira',
    'bracelet',
    'brinco',
    'earring',
    // Materials
    'ouro',
    'gold',
    'prata',
    'silver',
    'platina',
    'platinum',
    'diamante',
    'diamond',
    // General
    'comprar',
    'buy',
    'preço',
    'preco',
    'price',
    'disponível',
    'disponivel',
    'available',
    'modelo',
    'model',
    'catálogo',
    'catalogo',
    'catalog',
    'produto',
    'product',
    'busco',
    'procuro',
    'looking',
    'interested',
    'interesse',
  ]

  return productKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Build system prompt with product recommendations
 */
function buildSystemPrompt(
  products: SearchResult[],
  conversationContext?: string
): string {
  let prompt = `You are a luxury watch and jewelry sales assistant for a high-end boutique. You are knowledgeable, professional, and helpful.

Your primary goal is to understand customer needs and recommend products from the catalog.

Guidelines:
- Be warm and professional
- Ask clarifying questions to understand budget, style preferences, and occasion
- Use the catalog context below to make personalized recommendations
- If multiple products match, present 2-3 options with key differentiators
- Include prices when discussing specific products
- Never invent products - only recommend items from the catalog context
- If no relevant products found, ask more questions to narrow down preferences

`

  // Add conversation history context
  if (conversationContext) {
    prompt += `\nCONVERSATION HISTORY:\n${conversationContext}\n`
  }

  // Add product catalog context
  if (products.length > 0) {
    prompt += `\nRELEVANT PRODUCTS FROM CATALOG:\n\n`

    products.forEach((product, index) => {
      prompt += `${index + 1}. ${product.title}\n`
      prompt += `   Categoria: ${product.category}\n`

      if (product.price) {
        prompt += `   Preço: R$ ${product.price.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })}\n`
      }

      if (product.tags && product.tags.length > 0) {
        prompt += `   Tags: ${product.tags.join(', ')}\n`
      }

      prompt += `   Descrição: ${product.description}\n`
      prompt += `   Relevância: ${(product.similarity * 100).toFixed(1)}%\n`
      prompt += `\n`
    })

    prompt += `\nUse these products to make informed recommendations. Reference specific models when relevant.\n`
  } else {
    prompt += `\nNo specific products match this query yet. Ask questions to understand what the customer is looking for, then make recommendations.\n`
  }

  return prompt
}

/**
 * Build conversation context from message history
 */
async function buildConversationContext(
  tenantId: string,
  customerPhone: string,
  maxMessages: number
): Promise<string> {
  try {
    // Fetch recent messages
    const messages = await atSelect<MessageRecord>('Messages', {
      filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${customerPhone}', {deleted_at}='')`,
      maxRecords: maxMessages.toString(),
    })

    if (messages.length === 0) {
      return ''
    }

    // Reverse to chronological order
    const chronological = messages.reverse()

    // Format as conversation
    const lines = chronological.map((msg) => {
      const fields = msg.fields as any
      const direction = fields.direction === 'inbound' ? 'Customer' : 'Assistant'
      return `${direction}: ${fields.body}`
    })

    return lines.join('\n')
  } catch (error: any) {
    logInfo('rag-conversation-context', 'Failed to fetch conversation context', { error: error.message })
    return ''
  }
}

/**
 * Extract customer interests from conversation for proactive recommendations
 */
export async function extractCustomerInterests(
  tenantId: string,
  customerPhone: string
): Promise<string[]> {
  try {
    // Fetch recent inbound messages (customer's actual words)
    const messages = await atSelect<MessageRecord>('Messages', {
      filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${customerPhone}', {direction}='inbound', {deleted_at}='')`,
      maxRecords: '20',
    })

    if (messages.length === 0) {
      return []
    }

    // Combine all messages
    const allText = messages.map((m) => (m.fields as any).body).join(' ')

    // Extract brand mentions
    const brands = [
      'rolex',
      'patek philippe',
      'audemars piguet',
      'omega',
      'cartier',
      'iwc',
      'breitling',
      'tag heuer',
      'panerai',
    ]

    const interests = brands.filter((brand) =>
      allText.toLowerCase().includes(brand.toLowerCase())
    )

    return interests
  } catch (error: any) {
    return []
  }
}

/**
 * Format product recommendations for WhatsApp
 */
export function formatProductsForWhatsApp(products: SearchResult[]): string {
  if (products.length === 0) {
    return ''
  }

  let message = '🔍 *Produtos Recomendados:*\n\n'

  products.forEach((product, index) => {
    message += `${index + 1}. *${product.title}*\n`

    if (product.price) {
      message += `   💰 R$ ${product.price.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
      })}\n`
    }

    // Truncate description to first 100 chars
    const shortDesc =
      product.description.length > 100
        ? product.description.substring(0, 97) + '...'
        : product.description

    message += `   ${shortDesc}\n\n`
  })

  message += '_Para mais informações sobre algum produto, me envie o número correspondente._'

  return message
}

// Type definitions
interface MessageRecord {
  id: string
  fields: {
    tenant_id: string
    phone: string
    body: string
    direction: 'inbound' | 'outbound'
    created_at: string
    deleted_at?: string
  }
}
