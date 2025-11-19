import { atSelect } from '@/utils/airtable'
import { logInfo, logWarn } from './logger'

/**
 * Chrono24 integration and watch database verification
 *
 * Note: Chrono24 doesn't have a public API. This module provides:
 * 1. Mock data for development/testing
 * 2. Catalog-based lookup from Airtable
 * 3. Placeholder for future partner API integration
 */

export interface WatchMarketData {
  brand: string
  model: string
  reference: string
  averagePrice: number
  priceRange: { min: number; max: number }
  productionYears: string
  found: boolean
  source: 'catalog' | 'chrono24' | 'mock'
}

/**
 * Mock Chrono24 database (popular luxury watches)
 * This simulates market data until a real API is available
 */
const MOCK_WATCH_DATABASE: Record<string, WatchMarketData> = {
  // Rolex
  'rolex-submariner-116610ln': {
    brand: 'Rolex',
    model: 'Submariner Date',
    reference: '116610LN',
    averagePrice: 85000,
    priceRange: { min: 75000, max: 95000 },
    productionYears: '2010-2020',
    found: true,
    source: 'mock',
  },
  'rolex-submariner-124060': {
    brand: 'Rolex',
    model: 'Submariner No Date',
    reference: '124060',
    averagePrice: 95000,
    priceRange: { min: 85000, max: 105000 },
    productionYears: '2020-Present',
    found: true,
    source: 'mock',
  },
  'rolex-daytona-116500ln': {
    brand: 'Rolex',
    model: 'Daytona',
    reference: '116500LN',
    averagePrice: 185000,
    priceRange: { min: 165000, max: 210000 },
    productionYears: '2016-Present',
    found: true,
    source: 'mock',
  },
  'rolex-datejust-126334': {
    brand: 'Rolex',
    model: 'Datejust 41',
    reference: '126334',
    averagePrice: 65000,
    priceRange: { min: 55000, max: 75000 },
    productionYears: '2016-Present',
    found: true,
    source: 'mock',
  },

  // Patek Philippe
  'patek-nautilus-5711/1a': {
    brand: 'Patek Philippe',
    model: 'Nautilus',
    reference: '5711/1A',
    averagePrice: 450000,
    priceRange: { min: 400000, max: 550000 },
    productionYears: '2006-2021',
    found: true,
    source: 'mock',
  },
  'patek-aquanaut-5167a': {
    brand: 'Patek Philippe',
    model: 'Aquanaut',
    reference: '5167A',
    averagePrice: 250000,
    priceRange: { min: 220000, max: 280000 },
    productionYears: '2007-Present',
    found: true,
    source: 'mock',
  },

  // Audemars Piguet
  'ap-royal-oak-15500st': {
    brand: 'Audemars Piguet',
    model: 'Royal Oak',
    reference: '15500ST',
    averagePrice: 280000,
    priceRange: { min: 250000, max: 320000 },
    productionYears: '2019-Present',
    found: true,
    source: 'mock',
  },

  // Omega
  'omega-speedmaster-31130423001005': {
    brand: 'Omega',
    model: 'Speedmaster Professional Moonwatch',
    reference: '311.30.42.30.01.005',
    averagePrice: 35000,
    priceRange: { min: 30000, max: 40000 },
    productionYears: '2014-Present',
    found: true,
    source: 'mock',
  },

  // Cartier
  'cartier-santos-wssa0029': {
    brand: 'Cartier',
    model: 'Santos de Cartier',
    reference: 'WSSA0029',
    averagePrice: 45000,
    priceRange: { min: 40000, max: 50000 },
    productionYears: '2018-Present',
    found: true,
    source: 'mock',
  },
}

/**
 * Lookup watch in market database
 * Checks: 1) Airtable catalog, 2) Mock database, 3) Future: Real Chrono24 API
 */
export async function lookupWatch(
  brand: string,
  model: string,
  reference?: string
): Promise<WatchMarketData | null> {
  // Step 1: Try Airtable catalog first
  const catalogResult = await lookupInCatalog(brand, model, reference)
  if (catalogResult) return catalogResult

  // Step 2: Try mock database
  const mockResult = lookupInMockDatabase(brand, model, reference)
  if (mockResult) return mockResult

  // Step 3: Future: Call real Chrono24 API
  // const chrono24Result = await callChrono24API(brand, model, reference)
  // if (chrono24Result) return chrono24Result

  logWarn('chrono24', `Watch not found in any database`, { brand, model, reference })
  return null
}

/**
 * Lookup in Airtable catalog
 */
async function lookupInCatalog(
  brand: string,
  model: string,
  reference?: string
): Promise<WatchMarketData | null> {
  try {
    // Build filter formula
    let formula = `AND(LOWER({brand})=LOWER('${brand}'), LOWER({title})=FIND(LOWER('${model}'), LOWER({title})))`

    const results = await atSelect('Catalog', { filterByFormula: formula, maxRecords: '1' })

    if (results.length > 0) {
      const item = results[0].fields as any

      logInfo('chrono24', `Watch found in catalog`, { brand, model })

      return {
        brand,
        model,
        reference: reference || '',
        averagePrice: item.price || 0,
        priceRange: {
          min: item.price * 0.85,
          max: item.price * 1.15,
        },
        productionYears: 'Unknown',
        found: true,
        source: 'catalog',
      }
    }

    return null
  } catch (error) {
    logWarn('chrono24', `Catalog lookup failed`, { brand, model })
    return null
  }
}

/**
 * Lookup in mock database
 */
function lookupInMockDatabase(
  brand: string,
  model: string,
  reference?: string
): WatchMarketData | null {
  // Normalize search key
  const key = `${brand}-${model}${reference ? `-${reference}` : ''}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-/]/g, '')

  // Try exact match
  if (MOCK_WATCH_DATABASE[key]) {
    logInfo('chrono24', `Watch found in mock database`, { brand, model })
    return MOCK_WATCH_DATABASE[key]
  }

  // Try fuzzy match (brand + model only)
  for (const [dbKey, data] of Object.entries(MOCK_WATCH_DATABASE)) {
    if (
      dbKey.includes(brand.toLowerCase()) &&
      dbKey.includes(model.toLowerCase().split(' ')[0])
    ) {
      logInfo('chrono24', `Watch found in mock database (fuzzy match)`, { brand, model })
      return data
    }
  }

  return null
}

/**
 * Verify if seller is known/authorized dealer
 * Checks against a list of known authorized dealers
 */
export function verifyDealer(dealerName: string): {
  authorized: boolean
  confidence: number
  category: 'authorized' | 'known' | 'unknown'
} {
  const normalized = dealerName.toLowerCase()

  // List of known authorized dealers (expand as needed)
  const authorizedDealers = [
    'rolex',
    'bucherer',
    'tourneau',
    'watches of switzerland',
    'wempe',
    'patek philippe',
    'audemars piguet',
    'omega boutique',
    'cartier boutique',
  ]

  // List of known gray market/trusted sellers
  const knownSellers = [
    'chrono24',
    'bob\'s watches',
    'crown & caliber',
    'watchbox',
    'european watch company',
  ]

  // Check authorized dealers
  for (const dealer of authorizedDealers) {
    if (normalized.includes(dealer)) {
      return {
        authorized: true,
        confidence: 95,
        category: 'authorized',
      }
    }
  }

  // Check known sellers
  for (const seller of knownSellers) {
    if (normalized.includes(seller)) {
      return {
        authorized: false,
        confidence: 75,
        category: 'known',
      }
    }
  }

  return {
    authorized: false,
    confidence: 30,
    category: 'unknown',
  }
}

/**
 * Validate price against market data
 */
export function validatePrice(
  invoiceAmount: number,
  marketData: WatchMarketData | null
): {
  reasonable: boolean
  percentageOfMarket: number
  concern: string | null
} {
  if (!marketData) {
    return {
      reasonable: true, // Can't validate without market data
      percentageOfMarket: 0,
      concern: 'No market data available for price comparison',
    }
  }

  const percentage = (invoiceAmount / marketData.averagePrice) * 100

  // Price is suspiciously low (< 50% of market value)
  if (percentage < 50) {
    return {
      reasonable: false,
      percentageOfMarket: percentage,
      concern: `Price is ${Math.round(100 - percentage)}% below market value - possible counterfeit or stolen goods`,
    }
  }

  // Price is within reasonable range (50% - 150% of market value)
  if (percentage >= 50 && percentage <= 150) {
    return {
      reasonable: true,
      percentageOfMarket: percentage,
      concern: null,
    }
  }

  // Price is suspiciously high (> 150% of market value)
  return {
    reasonable: false,
    percentageOfMarket: percentage,
    concern: `Price is ${Math.round(percentage - 100)}% above market value - possible overpricing`,
  }
}

/**
 * Future: Integrate with real Chrono24 API
 * This is a placeholder for when/if Chrono24 provides partner API access
 */
async function callChrono24API(
  brand: string,
  model: string,
  reference?: string
): Promise<WatchMarketData | null> {
  // TODO: Implement when Chrono24 API becomes available
  // For now, this is a placeholder
  return null
}
