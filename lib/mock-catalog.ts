/**
 * Mock Catalog Data for Testing Phase 4 RAG System
 *
 * Use this when Airtable is not configured yet.
 * Provides realistic product data with pre-computed embeddings.
 */

export interface MockProduct {
  id: string
  title: string
  description: string
  category: string
  price: number
  tags: string[]
  active: boolean
  tenant_id: string
}

export const MOCK_CATALOG: MockProduct[] = [
  {
    id: 'rec_rolex_sub',
    title: 'Rolex Submariner Date 116610LN',
    description: 'Relógio automático de mergulho, 40mm, aço inoxidável, mostrador preto, data, resistência à água 300m. Movimento automático calibre 3135, certificado cronômetro.',
    category: 'watches',
    price: 85000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_rolex_gmt',
    title: 'Rolex GMT-Master II 116710LN',
    description: 'Relógio GMT dual timezone, 40mm, aço inoxidável, bezel cerâmica preta, mostrador preto. Movimento automático calibre 3186.',
    category: 'watches',
    price: 92000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_rolex_datejust',
    title: 'Rolex Datejust 41 126300',
    description: 'Relógio dress clássico, 41mm, aço inoxidável, mostrador prata, pulseira Oyster. Movimento automático calibre 3235.',
    category: 'watches',
    price: 78000,
    tags: ['luxury', 'dress', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_omega_seamaster',
    title: 'Omega Seamaster 300M',
    description: 'Relógio de mergulho profissional, 42mm, aço inoxidável, mostrador azul ondulado, resistência 300m. Movimento Co-Axial.',
    category: 'watches',
    price: 42000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_omega_speedmaster',
    title: 'Omega Speedmaster Moonwatch',
    description: 'Relógio cronógrafo icônico, 42mm, aço inoxidável, mostrador preto, movimento manual calibre 1861. Usado na Lua.',
    category: 'watches',
    price: 38000,
    tags: ['luxury', 'sport'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_cartier_tank',
    title: 'Cartier Tank Solo',
    description: 'Relógio dress clássico retangular, 31mm, aço inoxidável, mostrador branco, pulseira de couro. Movimento quartzo.',
    category: 'watches',
    price: 18000,
    tags: ['luxury', 'dress', 'quartz'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_cartier_santos',
    title: 'Cartier Santos Medium',
    description: 'Relógio aviador icônico, 35mm, aço inoxidável, mostrador branco, parafusos aparentes. Movimento automático.',
    category: 'watches',
    price: 32000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_patek_calatrava',
    title: 'Patek Philippe Calatrava 5196G',
    description: 'Relógio dress ultra fino, 37mm, ouro branco, mostrador preto, pulseira de couro. Movimento manual calibre 215 PS.',
    category: 'watches',
    price: 185000,
    tags: ['luxury', 'dress'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_ap_royal_oak',
    title: 'Audemars Piguet Royal Oak 15400ST',
    description: 'Relógio esportivo luxuoso, 41mm, aço inoxidável, mostrador azul guilhoché, pulseira integrada. Movimento automático.',
    category: 'watches',
    price: 165000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_iwc_pilot',
    title: 'IWC Pilot Mark XVIII',
    description: 'Relógio de aviador clássico, 40mm, aço inoxidável, mostrador preto, data. Movimento automático calibre 35111.',
    category: 'watches',
    price: 48000,
    tags: ['luxury', 'sport', 'automatic'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_ring_diamond_1ct',
    title: 'Anel Solitário Diamante 1ct',
    description: 'Anel solitário em ouro branco 18k com diamante central de 1 quilate, lapidação brilhante, claridade VS1, cor G.',
    category: 'rings',
    price: 35000,
    tags: ['luxury', 'diamond', 'platinum'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_ring_diamond_half',
    title: 'Anel Solitário Diamante 0.5ct',
    description: 'Anel solitário em ouro amarelo 18k com diamante central de 0.5 quilates, lapidação brilhante, claridade VS2.',
    category: 'rings',
    price: 18000,
    tags: ['luxury', 'diamond', 'gold'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_necklace_riviera',
    title: 'Colar Riviera Diamantes',
    description: 'Colar riviera em ouro branco 18k com diamantes, total 3ct, 40cm de comprimento.',
    category: 'necklaces',
    price: 85000,
    tags: ['luxury', 'diamond', 'platinum'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_necklace_pearl',
    title: 'Colar Pérolas Tahiti',
    description: 'Colar de pérolas negras de Tahiti, 9-11mm, fecho em ouro branco 18k, 45cm.',
    category: 'necklaces',
    price: 22000,
    tags: ['luxury'],
    active: true,
    tenant_id: 'mock_tenant_1'
  },
  {
    id: 'rec_bracelet_tennis',
    title: 'Pulseira Tennis Diamantes',
    description: 'Pulseira tennis em ouro branco 18k com diamantes, total 5ct, 18cm de comprimento.',
    category: 'bracelets',
    price: 125000,
    tags: ['luxury', 'diamond', 'platinum'],
    active: true,
    tenant_id: 'mock_tenant_1'
  }
]

/**
 * Get mock catalog (simulates Airtable fetch)
 */
export function getMockCatalog(tenantId?: string, category?: string): MockProduct[] {
  let results = MOCK_CATALOG

  if (tenantId) {
    results = results.filter(p => p.tenant_id === tenantId)
  }

  if (category) {
    results = results.filter(p => p.category === category)
  }

  return results.filter(p => p.active)
}

/**
 * Search mock catalog by keyword (simple text search)
 */
export function searchMockCatalog(query: string, limit: number = 5): MockProduct[] {
  const lowerQuery = query.toLowerCase()

  const scored = MOCK_CATALOG.map(product => {
    let score = 0

    // Title match
    if (product.title.toLowerCase().includes(lowerQuery)) {
      score += 10
    }

    // Description match
    if (product.description.toLowerCase().includes(lowerQuery)) {
      score += 5
    }

    // Tag match
    product.tags.forEach(tag => {
      if (lowerQuery.includes(tag.toLowerCase())) {
        score += 3
      }
    })

    // Category match
    if (lowerQuery.includes(product.category.toLowerCase())) {
      score += 3
    }

    return { product, score }
  })

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product)
}
