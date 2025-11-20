/**
 * Brand Knowledge System
 *
 * Injects luxury brand expertise into AI conversations.
 * Fetches relevant brand information and conversation guidelines.
 */

import { atSelect } from '@/utils/airtable'
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
 * Fetch brand knowledge from Airtable
 */
export async function getBrandKnowledge(
  brandNames: string[],
  tenantId?: string
): Promise<BrandKnowledgeRecord[]> {
  if (brandNames.length === 0) {
    return []
  }

  try {
    // Build filter formula to match any of the brand names
    const brandFilters = brandNames.map(brand =>
      `LOWER({brand_name})=LOWER('${brand.replace(/'/g, "\\'")}')`
    )

    const filterFormula = tenantId
      ? `AND(OR(${brandFilters.join(',')}), {tenant_id}='${tenantId}', {active}=TRUE())`
      : `AND(OR(${brandFilters.join(',')}), {active}=TRUE())`

    const records = await atSelect<any>('BrandKnowledge', {
      filterByFormula: filterFormula,
    })

    logInfo('brand-knowledge', 'Brand knowledge fetched', {
      requestedBrands: brandNames,
      foundRecords: records.length,
    })

    return records.map(record => ({
      id: record.id,
      brand_name: record.fields.brand_name,
      history_summary: record.fields.history_summary,
      key_selling_points: record.fields.key_selling_points,
      technical_highlights: record.fields.technical_highlights,
      target_customer_profile: record.fields.target_customer_profile,
      conversation_vocabulary: record.fields.conversation_vocabulary,
      price_positioning: record.fields.price_positioning,
      must_avoid: record.fields.must_avoid,
      active: record.fields.active,
    }))
  } catch (error: any) {
    logWarn('brand-knowledge', `Failed to fetch brand knowledge: ${error.message}`)
    return []
  }
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
  tenantId?: string
): Promise<string> {
  // Extract brands from user message
  const brandsFromMessage = extractBrandNames(userMessage)

  // Extract brands from product titles
  const brandsFromProducts = productTitles.flatMap(title => extractBrandNames(title))

  // Combine and deduplicate
  const allBrands = [...new Set([...brandsFromMessage, ...brandsFromProducts])]

  if (allBrands.length === 0) {
    return ''
  }

  // Fetch brand knowledge
  const brandRecords = await getBrandKnowledge(allBrands, tenantId)

  // Build context
  return buildBrandContext(brandRecords)
}
