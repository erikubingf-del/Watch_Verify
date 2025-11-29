/**
 * Brand Knowledge System
 *
 * Injects luxury brand expertise into AI conversations.
 * Fetches relevant brand information and conversation guidelines.
 */


import { logInfo, logWarn } from './logger'

export interface BrandKnowledgeRecord {
  id: string
  brand_name: string
  history_summary?: string
  key_selling_points?: string
  technical_highlights?: string
  target_customer_profile?: string
  conversation_vocabulary?: string
  price_positioning?: string
  must_avoid?: string
  active?: boolean
}

/**
 * Extract brand names from user message or product context
 */
function extractBrandNames(text: string): string[] {
  const normalizedText = text.toLowerCase()

  // Common luxury watch brands (expandable)
  const knownBrands = [
    'rolex',
    'patek philippe',
    'patek',
    'audemars piguet',
    'audemars',
    'ap',
    'omega',
    'cartier',
    'iwc',
    'breitling',
    'tag heuer',
    'tag',
    'panerai',
    'hublot',
    'vacheron constantin',
    'vacheron',
    'tudor',
    'longines',
    'jaeger-lecoultre',
    'jaeger',
    'richard mille',
    'zenith',
    'bell & ross',
    'bell',
    'chopard',
  ]

  const foundBrands = knownBrands.filter(brand => normalizedText.includes(brand))

  // Normalize multi-word brands
  const normalized = foundBrands.map(brand => {
    if (brand === 'patek' || brand === 'patek philippe') return 'Patek Philippe'
    if (brand === 'audemars' || brand === 'ap' || brand === 'audemars piguet') return 'Audemars Piguet'
    if (brand === 'vacheron' || brand === 'vacheron constantin') return 'Vacheron Constantin'
    if (brand === 'tag' || brand === 'tag heuer') return 'TAG Heuer'
    if (brand === 'jaeger' || brand === 'jaeger-lecoultre') return 'Jaeger-LeCoultre'
    if (brand === 'bell' || brand === 'bell & ross') return 'Bell & Ross'

    // Capitalize first letter
    return brand.charAt(0).toUpperCase() + brand.slice(1)
  })

  // Remove duplicates
  return [...new Set(normalized)]
}

/**
 * Fetch brand knowledge using RAG
 */
export async function getBrandKnowledge(
  brandNames: string[],
  tenantId?: string
): Promise<BrandKnowledgeRecord[]> {
  if (brandNames.length === 0) return []

  const { prisma } = await import('@/lib/prisma')
  const { generateEmbedding } = await import('@/lib/embeddings')

  const records: BrandKnowledgeRecord[] = []

  // For each brand, search knowledge base
  for (const brand of brandNames) {
    try {
      // Generate embedding for the brand name to find relevant docs
      const { embedding } = await generateEmbedding(`Brand guide for ${brand}`)
      const vectorQuery = `[${embedding.join(',')}]`

      // Search logic:
      // 1. Match similarity > 0.7
      // 2. Filter by tenantId OR global (tenantId is null)
      // 3. Prioritize tenant-specific content (we'll fetch top 3 and merge)

      const results = await prisma.$queryRaw`
        SELECT 
          id, 
          content, 
          "tenantId", 
          1 - (embedding <=> ${vectorQuery}::vector) as similarity
        FROM knowledge_base
        WHERE 
          (1 - (embedding <=> ${vectorQuery}::vector) > 0.7)
          AND ("tenantId" = ${tenantId} OR "tenantId" IS NULL)
        ORDER BY similarity DESC
        LIMIT 3
      ` as any[]

      if (results.length > 0) {
        // Combine content from found records
        const combinedContent = results.map(r => r.content).join('\n\n')

        records.push({
          id: results[0].id,
          brand_name: brand,
          history_summary: combinedContent.substring(0, 200) + '...', // Simple summary for now
          key_selling_points: combinedContent, // Pass full content as selling points for context
          active: true
        })
      }
    } catch (error) {
      logWarn('brand-knowledge', `Failed to fetch knowledge for ${brand}`, { error })
    }
  }

  return records
}

/**
 * Build brand context section for system prompt
 */
export function buildBrandContext(brandRecords: BrandKnowledgeRecord[]): string {
  if (brandRecords.length === 0) {
    return ''
  }

  let context = '\n=== BRAND EXPERTISE ===\n\n'
  context += 'You have deep knowledge about these luxury brands. Use this information to provide expert guidance:\n\n'

  brandRecords.forEach(brand => {
    context += `**${brand.brand_name}**\n`

    if (brand.history_summary) {
      context += `Heritage: ${brand.history_summary}\n`
    }

    if (brand.key_selling_points) {
      context += `Selling Points: ${brand.key_selling_points}\n`
    }

    if (brand.technical_highlights) {
      context += `Technical Excellence: ${brand.technical_highlights}\n`
    }

    if (brand.target_customer_profile) {
      context += `Ideal Customer: ${brand.target_customer_profile}\n`
    }

    if (brand.conversation_vocabulary) {
      context += `Vocabulary to Use: ${brand.conversation_vocabulary}\n`
    }

    if (brand.price_positioning) {
      context += `Positioning: ${brand.price_positioning}\n`
    }

    if (brand.must_avoid) {
      context += `⚠️ NEVER MENTION: ${brand.must_avoid}\n`
    }

    context += '\n'
  })

  context += '---\n\n'
  return context
}

/**
 * Enhanced brand knowledge extraction from message + product context
 */
export async function enrichWithBrandKnowledge(
  userMessage: string,
  productTitles: string[],
  tenantId?: string,
  allowedBrands?: string[]
): Promise<string> {
  // Extract brands from user message
  const brandsFromMessage = extractBrandNames(userMessage)

  // Extract brands from product titles
  const brandsFromProducts = productTitles.flatMap(title => extractBrandNames(title))

  // Combine and deduplicate
  let allBrands = [...new Set([...brandsFromMessage, ...brandsFromProducts])]

  // Filter by allowed brands (if provided)
  // This ensures we don't discuss brands the tenant doesn't carry
  if (allowedBrands && allowedBrands.length > 0) {
    allBrands = allBrands.filter(brand =>
      allowedBrands.some(allowed => allowed.toLowerCase() === brand.toLowerCase())
    )
  }

  if (allBrands.length === 0) {
    return ''
  }

  // Fetch brand knowledge
  const brandRecords = await getBrandKnowledge(allBrands, tenantId)

  // Build context
  return buildBrandContext(brandRecords)
}
