/**
 * RAG (Retrieval Augmented Generation) Context Builder
 *
 * Enhances AI responses with relevant catalog information.
 * Searches catalog semantically and formats results as context for GPT-4.
 */

import { searchCatalog, SearchResult, SearchOptions } from './semantic-search'
import { logInfo } from './logger'
import { prisma } from '@/lib/prisma'
import { enrichWithBrandKnowledge } from './brand-knowledge'
import { MessageDirection } from '@prisma/client'
import { config } from './config'
import { getToolsDefinition } from './tools'

export interface RAGContext {
  systemPrompt: string
  relevantProducts: SearchResult[]
  searchPerformed: boolean
  conversationContext?: string
  customerName?: string
  conversationGapHours?: number
  tools?: any[]
}

export interface RAGOptions {
  tenantId?: string
  customerPhone?: string
  includeConversationHistory?: boolean
  maxHistoryMessages?: number
  searchOptions?: SearchOptions
  skipGreeting?: boolean
  isFirstInteraction?: boolean
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
    maxHistoryMessages = config.limits.chatHistoryLimit,
    searchOptions = {},
    isFirstInteraction = false,
  } = options

  // Step 1: Get customer information (name + last interaction time)
  let customerName: string | undefined
  let conversationGapHours: number | undefined

  if (customerPhone && tenantId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: customerPhone
          }
        }
      })

      if (customer) {
        customerName = customer.name || undefined

        // Calculate conversation gap
        const lastInteraction = customer.lastInteraction
        if (lastInteraction) {
          const lastTime = new Date(lastInteraction).getTime()
          const now = Date.now()
          conversationGapHours = (now - lastTime) / (1000 * 60 * 60) // Convert ms to hours
        }
      }
    } catch (error: any) {
      logInfo('rag-customer-fetch', 'Failed to fetch customer info', { error: error.message })
    }
  }

  // Step 1b: Get store settings (verification enabled + welcome message + instructions)
  let verificationEnabled = false
  let welcomeMessage: string | undefined
  let customInstructions: string | undefined

  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (tenant) {
        const tenantConfig = tenant.config as any
        verificationEnabled = tenantConfig.verification_enabled === true
        welcomeMessage = tenantConfig.welcome_message || undefined
        customInstructions = tenantConfig.bot_instructions || undefined

        logInfo('rag-settings-loaded', 'Store settings loaded', {
          verificationEnabled,
          hasWelcomeMessage: !!welcomeMessage,
          hasCustomInstructions: !!customInstructions,
          allowedBrands: tenantConfig.allowed_brands,
          isFirstInteraction
        })
      }
    } catch (error: any) {
      logInfo('rag-settings-fetch', 'Failed to fetch store settings', { error: error.message })
    }
  }

  // Step 2: Semantic search for relevant products
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

  // Step 3: Get long-term facts (vector search)
  let customerFacts: string[] = []

  if (customerPhone && tenantId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: customerPhone
          }
        }
      })

      if (customer) {
        const { searchMemories } = await import('@/lib/memory')
        const memories = await searchMemories(customer.id, userMessage, 5, 0.65)
        customerFacts = memories.map(m => m.fact)

        logInfo('rag-memory-search', 'Retrieved customer memories', {
          customerId: customer.id,
          count: memories.length
        })
      }
    } catch (error: any) {
      logInfo('rag-facts-skip', 'Failed to retrieve customer facts', { error: error.message })
    }
  }

  // Step 4: Build conversation context (recent messages)
  let conversationContext = ''

  if (includeConversationHistory && customerPhone && tenantId) {
    conversationContext = await buildConversationContext(
      tenantId,
      customerPhone,
      maxHistoryMessages
    )
  }

  // Step 4: Get available brands (Config > Catalog) + detect if store sells jewelry
  let availableBrands: string[] = []
  let sellsJewelry = false

  if (tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      const config = tenant?.config as any

      // 1. Try Config
      if (config?.allowed_brands && Array.isArray(config.allowed_brands)) {
        availableBrands = config.allowed_brands
      }

      // 2. Fallback to Catalog if config is empty/missing
      if (availableBrands.length === 0) {
        const products = await prisma.product.findMany({
          where: { tenantId, isActive: true },
          select: { brand: true, category: true }
        })
        const brands = products.map((p: any) => p.brand).filter(Boolean) as string[]
        availableBrands = [...new Set(brands)]

        // Also check jewelry
        const jewelryCategories = ['rings', 'necklaces', 'bracelets', 'earrings', 'anel', 'colar', 'pulseira', 'brinco']
        sellsJewelry = products.some((p: any) => jewelryCategories.includes(p.category?.toLowerCase()))
      } else {
        // If using config, we still need to check jewelry... 
        // Let's just do a quick check for jewelry category in products anyway or add a config for it?
        // For now, let's keep the product check for jewelry detection as it's separate from "Allowed Brands" for knowledge.
        const productCount = await prisma.product.count({
          where: {
            tenantId,
            isActive: true,
            category: { in: ['rings', 'necklaces', 'bracelets', 'earrings', 'anel', 'colar', 'pulseira', 'brinco'] }
          }
        })
        sellsJewelry = productCount > 0
      }

    } catch (error) {
      availableBrands = []
      sellsJewelry = false
    }
  }

  // Step 5: Enrich with brand knowledge
  const productTitles = relevantProducts.map(p => p.title)
  const brandContext = await enrichWithBrandKnowledge(userMessage, productTitles, tenantId, availableBrands)

  // Step 6: Build system prompt with catalog context + brand knowledge + verification + jewelry + welcome + facts
  const systemPrompt = buildSystemPrompt(
    relevantProducts,
    conversationContext,
    brandContext,
    availableBrands,
    customerName,
    conversationGapHours,
    verificationEnabled,
    sellsJewelry,
    welcomeMessage,
    options.skipGreeting,
    customerFacts,
    customInstructions,
    isFirstInteraction
  )

  return {
    systemPrompt,
    relevantProducts,
    searchPerformed,
    conversationContext,
    customerName,
    conversationGapHours,
    tools: getToolsDefinition()
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
    'rolex', 'patek', 'philippe', 'audemars', 'piguet', 'omega', 'cartier', 'iwc', 'breitling', 'tag', 'heuer', 'panerai', 'hublot', 'vacheron', 'constantin',
    // Watch types
    'relógio', 'relogio', 'watch', 'cronógrafo', 'cronografo', 'automático', 'automatico', 'diver', 'mergulho',
    // Jewelry
    'anel', 'ring', 'colar', 'necklace', 'pulseira', 'bracelet', 'brinco', 'earring',
    // Materials
    'ouro', 'gold', 'prata', 'silver', 'platina', 'platinum', 'diamante', 'diamond',
    // General
    'comprar', 'buy', 'preço', 'preco', 'price', 'disponível', 'disponivel', 'available', 'modelo', 'model', 'catálogo', 'catalogo', 'catalog', 'produto', 'product', 'busco', 'procuro', 'looking', 'interested', 'interesse',
  ]

  return productKeywords.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * Build system prompt with product recommendations + brand knowledge + store capabilities
 */
function buildSystemPrompt(
  products: SearchResult[],
  conversationContext?: string,
  brandContext?: string,
  availableBrands?: string[],
  customerName?: string,
  conversationGapHours?: number,
  verificationEnabled?: boolean,
  sellsJewelry?: boolean,
  welcomeMessage?: string,
  skipGreeting?: boolean,
  customerFacts?: string[],
  customInstructions?: string,
  isFirstInteraction?: boolean
): string {

  // Start with base instructions from config OR custom instructions
  let prompt = customInstructions || config.botInstructions

  // Append dynamic context
  prompt += `\n\n[CONTEXT]\n`

  if (customerName) {
    prompt += `Customer Name: ${customerName}\n`
  }

  if (availableBrands && availableBrands.length > 0) {
    prompt += `Available Brands: ${availableBrands.join(', ')}\n`
  }

  if (verificationEnabled) {
    prompt += `Services: Watch Verification Available\n`
  }

  // Add long-term facts FIRST (most important context)
  if (customerFacts && customerFacts.length > 0) {
    prompt += `\n[KNOWN FACTS ABOUT CUSTOMER]\n`
    customerFacts.forEach(fact => {
      prompt += `• ${fact}\n`
    })
    prompt += `\n⚠️ USE THESE FACTS: Reference customer's preferences naturally in your response\n`
  }

  // Add conversation history
  if (conversationContext) {
    prompt += `\n[RECENT CONVERSATION]\n${conversationContext}\n`

    if (conversationGapHours && conversationGapHours > 1 && conversationGapHours < 24) {
      prompt += `\n[SYSTEM NOTE]: The user has returned after ${conversationGapHours.toFixed(1)} hours. Briefly welcome them back and summarize/resume the last topic naturally.\n`
    }
  }

  // Add products
  if (products.length > 0) {
    prompt += `\nRELEVANT PRODUCTS FROM CATALOG:\n`
    products.forEach((p, i) => {
      const priceStr = p.price ? `R$ ${p.price.toLocaleString('pt-BR')}` : 'Preço sob consulta'
      prompt += `${i + 1}. ${p.title} - ${priceStr}\n`
      if (p.description) {
        prompt += `   ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}\n`
      }
    })
    prompt += `\n⚠️ CRITICAL: ONLY mention products listed above. Never invent products.\n`
  }

  // Add brand expertise context (if available)
  if (brandContext) {
    prompt += `\n[BRAND KNOWLEDGE]\n${brandContext}\n`
  }

  // Handle Welcome Message Logic (Memory)
  if (isFirstInteraction && welcomeMessage) {
    prompt += `\n[SYSTEM]: This is a new user. You MUST start your response with the exact welcome message below:\n"${welcomeMessage}"\n`
  } else if (!isFirstInteraction && welcomeMessage) {
    // Returning user: Explicitly DO NOT include the welcome message in the prompt to avoid repetition
    // We can add a negative constraint if needed, but omitting it is usually enough.
    prompt += `\n[SYSTEM]: Returning user. Do NOT use the standard welcome message. Answer directly and naturally.\n`
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
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          tenantId,
          customer: {
            phone: customerPhone
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: maxMessages,
      select: {
        direction: true,
        content: true
      }
    })

    if (messages.length === 0) {
      return ''
    }

    // Reverse to chronological order
    const chronological = messages.reverse()

    // Format as conversation
    const lines = chronological.map((msg: any) => {
      const direction = msg.direction === MessageDirection.INBOUND ? 'Customer' : 'Assistant'
      return `${direction}: ${msg.content}`
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
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          tenantId,
          customer: {
            phone: customerPhone
          }
        },
        direction: MessageDirection.INBOUND
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      select: {
        content: true
      }
    })

    if (messages.length === 0) {
      return []
    }

    // Combine all messages
    const allText = messages.map((m: any) => m.content).join(' ')

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
