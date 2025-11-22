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
  customerName?: string
  conversationGapHours?: number
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

  // Step 1: Get customer information (name + last interaction time) + store settings
  let customerName: string | undefined
  let conversationGapHours: number | undefined
  let verificationEnabled = false

  if (customerPhone && tenantId) {
    try {
      const customers = await atSelect('Customers', {
        filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${customerPhone}')`,
        maxRecords: '1',
      })

      if (customers.length > 0) {
        const customerFields = customers[0].fields as any
        customerName = customerFields.name

        // Calculate conversation gap
        const lastInteraction = customerFields.last_interaction
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

  // Step 1b: Get store settings (verification enabled)
  if (tenantId) {
    try {
      const settings = await atSelect('Settings', {
        filterByFormula: `{tenant_id}='${tenantId}'`,
        maxRecords: '1',
      })

      if (settings.length > 0) {
        const settingsFields = settings[0].fields as any
        verificationEnabled = settingsFields.verification_enabled === true
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

  // Step 3: Build conversation context (optional)
  let conversationContext = ''

  if (includeConversationHistory && customerPhone && tenantId) {
    conversationContext = await buildConversationContext(
      tenantId,
      customerPhone,
      maxHistoryMessages
    )
  }

  // Step 4: Get available brands from catalog + detect if store sells jewelry
  let availableBrands: string[] = []
  let sellsJewelry = false

  if (tenantId) {
    try {
      const allProducts = await atSelect('Catalog', {
        filterByFormula: `AND({tenant_id}='${tenantId}', {active}=TRUE())`,
      })
      const brands = allProducts.map((p: any) => p.fields.brand).filter(Boolean)
      availableBrands = [...new Set(brands)] // Unique brands

      // Check if any products are jewelry (rings, necklaces, bracelets, earrings)
      const jewelryCategories = ['rings', 'necklaces', 'bracelets', 'earrings']
      sellsJewelry = allProducts.some((p: any) =>
        jewelryCategories.includes(p.fields.category?.toLowerCase())
      )
    } catch (error) {
      // If brand field doesn't exist, extract from title
      availableBrands = []
      sellsJewelry = false
    }
  }

  // Step 5: Enrich with brand knowledge
  const productTitles = relevantProducts.map(p => p.title)
  const brandContext = await enrichWithBrandKnowledge(userMessage, productTitles, tenantId)

  // Step 6: Build system prompt with catalog context + brand knowledge + verification + jewelry
  const systemPrompt = buildSystemPrompt(
    relevantProducts,
    conversationContext,
    brandContext,
    availableBrands,
    customerName,
    conversationGapHours,
    verificationEnabled,
    sellsJewelry
  )

  return {
    systemPrompt,
    relevantProducts,
    searchPerformed,
    conversationContext,
    customerName,
    conversationGapHours,
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
  sellsJewelry?: boolean
): string {
  let prompt = `You are a luxury watch and jewelry sales assistant for a high-end boutique in Brazil.

PERSONALITY & TONE:
- Elegant but approachable (use "você", not overly formal)
- Warm professionalism: "Fico feliz em ajudar" ✅ not "Estou disponível para assistência" ❌
- Concise and objective (no AI verbosity)
- Valorize products without overselling
- Subtle technical knowledge (mention caliber/movement naturally)
- Customer-focused, not sales-focused

CUSTOMER NAME USAGE (CRITICAL):
${customerName
  ? `- Customer's name is: ${customerName}
- ALWAYS use their name naturally: "Olá ${customerName}!", "Posso ajudar, ${customerName}?", "Claro, ${customerName}!"
- Make them feel known and valued by using their name throughout
`
  : `- Customer has NO name on record yet
- Early in conversation, ask politely: "Como posso te chamar?" or "Qual seu nome?"
- Once they tell you, use it immediately: "Prazer, [name]! Como posso ajudar?"
- This builds personal connection (luxury service standard)
`}
GREETING RULES:
${conversationGapHours !== undefined && conversationGapHours >= 2
  ? `- Last conversation was ${conversationGapHours.toFixed(1)} hours ago (>2 hours)
- You MAY restart with "Olá${customerName ? ` ${customerName}` : ''}!" (natural human behavior)
- Then ask: "Como posso ajudar hoje?" (fresh start)
`
  : `- Customer is actively engaged in conversation
- DO NOT restart with "Olá!" mid-conversation (feels robotic)
- Continue naturally from previous context
`}
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

FIRST CONTACT INTRODUCTION (New Customers Only):
${!conversationContext || conversationContext.length === 0
  ? `- When greeting a NEW customer for the first time, introduce the store briefly and elegantly:
- Example: "Olá! Somos uma boutique especializada em relógios de luxo${sellsJewelry ? ' e joias' : ''}. Trabalhamos com ${availableBrands && availableBrands.length > 0 ? availableBrands.slice(0, 3).join(', ') : 'marcas de prestígio'}${verificationEnabled ? '. Também oferecemos verificação de relógios para quem deseja vender' : ''}. Como posso ajudar?"
- Keep it SHORT (1-2 sentences) - get to the point quickly
- Mention: (1) Store type (relógios${sellsJewelry ? ' e joias' : ''}), (2) Top brands, ${verificationEnabled ? '(3) Verification service' : ''}
- Then ask: "Como posso ajudar?" or "Procura algo específico?"
`
  : `- Customer has existing conversation history - DO NOT repeat introduction
- Continue naturally from where conversation left off
`}
SERVICES AVAILABLE:
- ✅ Product purchase (${sellsJewelry ? 'watches & jewelry' : 'luxury watches'})
- ✅ Visit scheduling
- ✅ Product recommendations
${verificationEnabled
  ? `- ✅ Watch verification/authentication (IMPORTANT: Read rules below)
- ❌ Watch BUYING service (we evaluate but don't buy for resale)`
  : `- ❌ Watch verification (NOT available at this store)
- ❌ Watch BUYING service (we don't buy watches from customers)`}

${verificationEnabled
  ? `WATCH VERIFICATION SERVICE (Critical Rules):
⚠️ VERIFICATION PRICING POLICY:
- NEVER provide pricing estimates during verification conversation
- NEVER say "vale aproximadamente R$ X" or similar estimates
- The AI can AUTHENTICATE (verify if real/fake) but CANNOT price watches
- Pricing requires human expert evaluation after full verification process

When customer asks to SELL their watch:
1. Offer verification: "Posso ajudar com a verificação/autenticação do seu relógio. Preciso de algumas fotos para analisar."
2. If they accept: Start verification flow (photos of watch, guarantee card, invoice)
3. During verification: Explain authenticity only, NOT value
4. After verification completes: "Seu relógio foi verificado. Para discutir valores, recomendo uma visita à loja para nosso especialista avaliar pessoalmente. Gostaria de agendar?"
5. If they insist on price during chat: "Valores só podem ser fornecidos após análise completa do especialista na loja, considerando estado de conservação, acessórios e mercado atual."

Key Messages:
- ✅ "Posso verificar a autenticidade do seu relógio"
- ✅ "Nosso especialista precisa analisar pessoalmente para definir valores"
- ❌ "Seu relógio vale aproximadamente R$ X" (NEVER estimate price)
- ❌ "Compramos relógios usados" (we verify but don't buy for resale)
`
  : `WATCH VERIFICATION (NOT AVAILABLE):
- If customer asks to verify/sell watch: "No momento não oferecemos serviço de verificação de relógios. Podemos ajudar com a compra de novos modelos. Está interessado em conhecer nosso catálogo?"
`}

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
      filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${customerPhone}', {deleted_at}=BLANK())`,
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
