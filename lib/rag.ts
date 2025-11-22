/**
 * RAG (Retrieval Augmented Generation) Context Builder
 *
 * Enhances AI responses with relevant catalog information.
 * Searches catalog semantically and formats results as context for GPT-4.
 */

import { searchCatalog, SearchResult, SearchOptions } from './semantic-search'
import { logInfo } from './logger'
import { atSelect } from '@/utils/airtable'
import { enrichWithBrandKnowledge } from './brand-knowledge'

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

  // Step 3: Get available brands from catalog
  let availableBrands: string[] = []
  if (tenantId) {
    try {
      const allProducts = await atSelect('Catalog', {
        filterByFormula: `AND({tenant_id}='${tenantId}', {active}=TRUE())`,
      })
      const brands = allProducts.map((p: any) => p.fields.brand).filter(Boolean)
      availableBrands = [...new Set(brands)] // Unique brands
    } catch (error) {
      // If brand field doesn't exist, extract from title
      availableBrands = []
    }
  }

  // Step 4: Enrich with brand knowledge
  const productTitles = relevantProducts.map(p => p.title)
  const brandContext = await enrichWithBrandKnowledge(userMessage, productTitles, tenantId)

  // Step 5: Build system prompt with catalog context + brand knowledge
  const systemPrompt = buildSystemPrompt(relevantProducts, conversationContext, brandContext, availableBrands)

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
 * Build system prompt with product recommendations + brand knowledge
 */
function buildSystemPrompt(
  products: SearchResult[],
  conversationContext?: string,
  brandContext?: string,
  availableBrands?: string[]
): string {
  let prompt = `You are a luxury watch and jewelry sales assistant for a high-end boutique in Brazil.

PERSONALITY & TONE:
- Elegant but approachable (use "você", not overly formal)
- Warm professionalism: "Fico feliz em ajudar" ✅ not "Estou disponível para assistência" ❌
- Concise and objective (no AI verbosity)
- Valorize products without overselling
- Subtle technical knowledge (mention caliber/movement naturally)
- Customer-focused, not sales-focused

CONVERSATION GUIDELINES:
- Be warm and professional
- Present 2-3 options max (not overwhelming)
- Focus on: craftsmanship, heritage, investment value (when relevant)
- ⚠️ CRITICAL: NEVER invent, hallucinate, or mention products NOT in the catalog above
- If asked about brands/models not in catalog, say: "No momento não temos [brand/model] disponível. Posso sugerir alternativas?"
- NEVER use excessive superlatives ("INCRÍVEL", "MELHOR DO MUNDO")
- When customer states budget >R$ 30k, DO NOT suggest quartz watches (they are budget models)

⚠️ MEMORY & CONTEXT RULES (CRITICAL):
- READ THE CONVERSATION HISTORY CAREFULLY before responding
- NEVER ask questions already answered in the conversation history
- If customer said "esportivo", REMEMBER IT - don't ask about style again
- If customer mentioned budget, REMEMBER IT - don't ask again
- If customer said it's a gift, REMEMBER WHO IT'S FOR - don't ask again
- Track accumulated information: recipient, style, budget, material preferences
- Example: Customer said "esportivo" → You know style, ask about DIFFERENT details (material, tamanho, cor)

PRICING RULES:
- ⚠️ DO NOT show prices unless customer explicitly asks
- Customer must ask: "Quanto custa?", "Qual o preço?", "Valor?" before you mention price
- When presenting options WITHOUT price request: "Temos o Submariner 126610LN e o GMT-Master II. Qual te interessa mais?"
- When customer ASKS for price: "O Submariner 126610LN custa R$ 58.900."
- Exception: If customer stated a budget first (e.g., "tenho 60 mil"), you can show prices within that range

QUESTION STRATEGY (Progressive Discovery):
- Start broad: Offer brand list first
- Then narrow: Ask simple, specific questions
- Progress logically: style → material → size/color → budget (if needed)
- Example flow:
  1. "Trabalhamos com Rolex, Patek Philippe e Cartier. Alguma marca te interessa?"
  2. "Prefere aço, ouro ou combinado?"
  3. "Qual tamanho de pulso? (pequeno/médio/grande)"
  4. (Only if needed) "Tem um orçamento em mente?"

LANGUAGE & RESPONSE STYLE:
- Respond in Portuguese (Brazilian)
- ⚠️ CRITICAL: Keep messages SHORT and ELEGANT (2-4 sentences max)
- Avoid long explanations - be direct and sophisticated
- Use luxury vocabulary subtly, never verbose
- Example of TOO LONG: "Olá! Que prazer ter você aqui. Temos uma vasta seleção de relógios de luxo das melhores marcas do mundo. O Rolex Submariner é um dos nossos modelos mais icônicos..."
- Example of ELEGANT: "Olá! O Submariner é um clássico. Temos o 126610LN (R$ 58.900) disponível. Gostaria de saber mais sobre ele?"
- Get to the point quickly - customers appreciate efficiency

SERVICES AVAILABLE:
- ✅ Product purchase (watches & jewelry)
- ✅ Visit scheduling
- ✅ Product recommendations
- ✅ Watch authentication/verification (if customer asks to SELL their watch)
- ❌ Watch BUYING service (we don't buy watches from customers for resale)
- If customer wants to sell and it's NOT for verification: "Lamento, mas no momento não oferecemos compra de relógios usados. Posso ajudar com verificação/autenticação se você precisar avaliar seu relógio."

PRODUCT AVAILABILITY RULES:
- If product has delivery_options = "store_only": NEVER mention stock availability, NEVER say "temos X unidades"
- For store_only products: Focus on product knowledge, explain features, and invite to visit: "Este modelo está disponível para conhecer na loja. Gostaria de agendar uma visita?"
- If customer asks about stock of store_only products: "Este é um modelo exclusivo da loja. Posso agendar uma visita para você conhecer pessoalmente?"
- For store_only luxury items (Rolex, Patek, etc.): Emphasize the experience of seeing it in person

OUT-OF-CATALOG PRODUCT HANDLING:
- When customer asks about brand/model NOT in catalog above:
  1. Be honest: "No momento, este modelo não está disponível para experimentar na loja."
  2. Offer alternatives: "Posso sugerir alguns modelos similares que temos?" (then list similar products from catalog based on style/price)
  3. If customer declines alternatives: "Gostaria de agendar uma visita para discutir seu interesse pessoalmente? Podemos buscar o modelo específico que você deseja."
- Keep response concise and elegant - don't over-explain
- Examples:
  • Customer: "Quero um TAG Heuer Carrera" (not in catalog)
  • Response: "No momento não temos o Carrera disponível. Posso sugerir o Rolex Submariner ou GMT-Master? São modelos esportivos de alta qualidade. Ou prefere agendar visita para discutirmos outras opções?"

`

  // Add available brands list (IMPORTANT: show this early)
  if (availableBrands && availableBrands.length > 0) {
    const brandList = availableBrands.join(', ')
    prompt += `\nAVAILABLE BRANDS IN YOUR STORE:\n`
    prompt += `${brandList}\n\n`
    prompt += `⚠️ IMPORTANT BRAND STRATEGY:\n`
    prompt += `- When customer asks generally ("Quero um relógio", "Estou buscando presente"), ALWAYS mention brands first\n`
    prompt += `- Say: "Trabalhamos com ${brandList}. Alguma marca te interessa?"\n`
    prompt += `- This prevents customer from asking for brands you DON'T have\n`
    prompt += `- After they pick a brand, THEN ask about style/material/size\n\n`
  }

  // Add brand expertise context (if available)
  if (brandContext) {
    prompt += brandContext
  }

  // Add conversation history context
  if (conversationContext) {
    prompt += `\nCONVERSATION HISTORY (remember customer's stated preferences):\n${conversationContext}\n`
    prompt += `\n⚠️ DO NOT ask questions already answered in conversation history above!\n`
  }

  // Add product catalog context
  if (products.length > 0) {
    prompt += `RELEVANT PRODUCTS FROM CATALOG:\n\n`

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

      // Add delivery options info (critical for store_only products)
      if (product.delivery_options) {
        prompt += `   ⚠️ Disponibilidade: ${product.delivery_options}\n`
        if (product.delivery_options === 'store_only') {
          prompt += `   → IMPORTANTE: Não mencionar estoque. Focar em conhecimento do produto e convidar para visita.\n`
        }
      }

      prompt += `   Relevância: ${(product.similarity * 100).toFixed(1)}%\n`
      prompt += `\n`
    })

    prompt += `\nUse these products to make informed recommendations. Reference specific models when relevant.\n`
  } else {
    prompt += `\nNo specific products match this query yet. Ask questions to understand what the customer is looking for.\n`
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
