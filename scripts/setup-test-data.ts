/**
 * Comprehensive Test Data Setup for Watch Verify CRM
 *
 * This script populates Airtable with realistic test data for all scenarios:
 * 1. Brand Knowledge (Rolex, Patek, Cartier, Diamonds)
 * 2. Catalog Products (watches, jewelry with embeddings)
 * 3. Salespeople (for assignment testing)
 * 4. Sample customers with interests
 * 5. Store availability slots
 */

import { atCreate, atSelect } from '../utils/airtable'
import { generateEmbedding } from '../lib/embeddings'

const TENANT_ID = 'recduwNrt9qNPH07h' // Your test tenant

// ============================================================================
// BRAND KNOWLEDGE - Detailed selling arguments and technical specs
// ============================================================================

const BRAND_KNOWLEDGE = [
  // ROLEX
  {
    tenant_id: [TENANT_ID],
    brand: 'Rolex',
    model: 'Submariner',
    category: 'watch',
    key_features: JSON.stringify([
      'Resistência à água até 300m',
      'Movimento automático Calibre 3235',
      'Reserva de marcha de 70 horas',
      'Válvula de hélio para mergulho profundo',
      'Certificação de cronômetro superlativo',
      'Luneta unidirecional rotativa'
    ]),
    selling_arguments: JSON.stringify([
      'Ícone do mergulho profissional desde 1953',
      'Valorização média de 8-12% ao ano (mercado secundário)',
      'Reconhecimento instantâneo - status symbol global',
      'Durabilidade excepcional - relógios passam de geração em geração',
      'Lista de espera em revendedores autorizados (exclusividade)',
      'Investimento sólido - nunca sai de moda'
    ]),
    technical_specs: JSON.stringify({
      movement: 'Calibre 3235, automático, manufatura Rolex',
      power_reserve: '70 horas',
      case_diameter: '41mm',
      case_material: 'Aço Oystersteel 904L',
      bracelet: 'Oyster, elos maciços',
      water_resistance: '300 metros (1000 pés)',
      crystal: 'Safira com lente Cyclops',
      functions: 'Horas, minutos, segundos, data'
    }),
    price_range_min: 45000,
    price_range_max: 65000,
    target_audience: 'Profissionais 35-55 anos, renda alta, interesse em mergulho/esportes aquáticos',
    common_objections: JSON.stringify({
      'Muito caro': 'Rolex é investimento, não despesa. Valoriza ao longo do tempo.',
      'Posso esperar descontar': 'Lista de espera de 2-5 anos. Mercado secundário cobra MAIS que tabela.',
      'Prefiro smartwatch': 'Smartwatch obsoleto em 3 anos. Rolex eterno e valoriza.'
    }),
    care_instructions: 'Revisão a cada 5 anos em centro autorizado. Evitar choques térmicos. Limpar com pano macio.',
  },

  {
    tenant_id: [TENANT_ID],
    brand: 'Rolex',
    model: 'Datejust',
    category: 'watch',
    key_features: JSON.stringify([
      'Design clássico atemporal',
      'Lente Cyclops sobre a data',
      'Movimento automático Calibre 3235',
      'Pulseira Jubilee ou Oyster',
      'Disponível em diversos tamanhos (31mm, 36mm, 41mm)'
    ]),
    selling_arguments: JSON.stringify([
      'Rolex mais versátil - combina com terno e casual',
      'Presente icônico para conquistas (formatura, promoção)',
      'Opções de personalização (mostrador, pulseira, luneta)',
      'Usado por presidentes e CEOs globalmente',
      'Entrada no mundo Rolex - preço mais acessível'
    ]),
    technical_specs: JSON.stringify({
      movement: 'Calibre 3235, automático',
      case_diameter: '41mm, 36mm ou 31mm',
      water_resistance: '100 metros',
      bracelet: 'Jubilee ou Oyster',
      crystal: 'Safira com lente Cyclops'
    }),
    price_range_min: 35000,
    price_range_max: 55000,
    target_audience: 'Executivos, profissionais liberais, presente para conquistas',
  },

  // PATEK PHILIPPE
  {
    tenant_id: [TENANT_ID],
    brand: 'Patek Philippe',
    model: 'Nautilus',
    category: 'watch',
    key_features: JSON.stringify([
      'Design Gerald Genta (1976) - lendário',
      'Caixa octogonal integrada à pulseira',
      'Movimento ultra-fino manufatura',
      'Relógio esportivo de luxo definitivo',
      'Mostrador guilhochê horizontal'
    ]),
    selling_arguments: JSON.stringify([
      'Lista de espera de 10+ anos (raridade extrema)',
      'Mercado secundário: 3-5x valor de tabela',
      'Relógio mais desejado do mundo (junto com Rolex Daytona)',
      '"Você nunca possui um Patek Philippe, apenas o guarda para próxima geração"',
      'Investimento de altíssimo retorno - valorização garantida',
      'Status supremo - reconhecido por conhecedores'
    ]),
    technical_specs: JSON.stringify({
      movement: 'Calibre 324 S C, automático, ultra-fino',
      case_diameter: '40mm',
      case_material: 'Aço inoxidável (mais raro que ouro)',
      thickness: '8.3mm (ultra-fino)',
      water_resistance: '120 metros',
      bracelet: 'Integrada, elos articulados'
    }),
    price_range_min: 180000,
    price_range_max: 350000,
    target_audience: 'Ultra-high net worth individuals, colecionadores sérios',
    common_objections: JSON.stringify({
      'Preço absurdo': 'Patek não é relógio, é obra de arte relojeira. Mercado paga o dobro.',
      'Não parece tão caro': 'Understatement proposital. Reconhecido por quem entende.',
      'Posso comprar Rolex e sobra dinheiro': 'Rolex é popular. Patek é exclusivo. Públicos diferentes.'
    }),
  },

  // JEWELRY - DIAMONDS
  {
    tenant_id: [TENANT_ID],
    brand: 'Tiffany & Co.',
    model: 'Solitaire Diamond Ring',
    category: 'jewelry',
    key_features: JSON.stringify([
      'Diamante certificado GIA ou IGI',
      '4Cs: Cut (lapidação), Color (cor), Clarity (pureza), Carat (quilate)',
      'Engaste em ouro 18k ou platina',
      'Setting clássico Tiffany (6 garras)'
    ]),
    selling_arguments: JSON.stringify([
      'Símbolo eterno de compromisso e amor',
      'Diamante é para sempre - não perde valor',
      'Certificação garante autenticidade e revenda',
      'Presente que emociona - momento inesquecível',
      'Pode ser usado diariamente ou ocasiões especiais',
      'Investimento emocional e financeiro'
    ]),
    technical_specs: JSON.stringify({
      diamond_4cs: {
        cut: 'Excellent (máxima lapidação - brilho intenso)',
        color: 'D-F (incolor - mais valioso)',
        clarity: 'VS1-VVS2 (inclusões invisíveis a olho nu)',
        carat: '0.5ct a 3.0ct (1ct = 6.5mm diâmetro)'
      },
      setting_metal: 'Ouro 18k branco, amarelo, rosé ou Platina 950',
      setting_style: 'Solitaire (clássico), Halo, Pavé, Three-Stone',
      certification: 'GIA (Gemological Institute of America) - padrão ouro',
    }),
    price_range_min: 15000,
    price_range_max: 150000,
    target_audience: 'Noivos, aniversários de casamento, presentes especiais',
    common_objections: JSON.stringify({
      'Diamante de laboratório é mais barato': 'Natural tem história geológica de bilhões de anos. Lab é fabricado.',
      'Não sei escolher': 'Nosso gemólogo explica cada detalhe. Certificação GIA garante.',
      'Medo de perder/roubar': 'Seguro específico para joias. Caixinha Tiffany já é símbolo.'
    }),
    care_instructions: 'Limpar mensalmente com água morna e sabão neutro. Guardar separado de outras joias. Revisão anual do engaste.',
  },

  // CARTIER LOVE BRACELET
  {
    tenant_id: [TENANT_ID],
    brand: 'Cartier',
    model: 'Love Bracelet',
    category: 'jewelry',
    key_features: JSON.stringify([
      'Icônico design com parafusos',
      'Trava com chave especial (simbolismo)',
      'Ouro 18k rosa, amarelo ou branco',
      'Versões com ou sem diamantes'
    ]),
    selling_arguments: JSON.stringify([
      'Símbolo de amor eterno - usado 24/7 (não tira)',
      'Usado por celebridades globalmente',
      'Design atemporal - nunca sai de moda',
      'Pode formar coleção (stack múltiplas peças)',
      'Presente romântico com significado profundo',
      'Valorização constante - mercado secundário forte'
    ]),
    price_range_min: 28000,
    price_range_max: 85000,
    target_audience: 'Casais, presentes de compromisso, aniversários especiais',
  }
]

// ============================================================================
// CATALOG PRODUCTS - Real inventory with detailed descriptions
// ============================================================================

const CATALOG_PRODUCTS = [
  // ROLEX
  {
    tenant_id: [TENANT_ID],
    title: 'Rolex Submariner Date 126610LN',
    brand: 'Rolex',
    category: 'Relógios > Mergulho',
    description: 'Rolex Submariner Date em aço com mostrador preto. Movimento Calibre 3235, resistência a 300m. Luneta Cerachrom preta. Pulseira Oyster. Ano 2024, lacrado com garantia internacional.',
    price: 58900,
    stock_quantity: 1,
    image_url: 'https://content.rolex.com/dam/2024/upright-bba-with-shadow/m126610ln-0001.png',
    tags: 'rolex, submariner, mergulho, aço, preto, novo, 2024',
    active: true,
    features: JSON.stringify({
      ref: '126610LN',
      year: 2024,
      condition: 'Novo lacrado',
      box_papers: 'Completo - caixa, papéis, cartão garantia',
      warranty: 'Garantia internacional Rolex 5 anos',
      delivery: 'Imediato',
    }),
  },

  {
    tenant_id: [TENANT_ID],
    title: 'Rolex Datejust 41 126334 Jubilee Blue',
    brand: 'Rolex',
    category: 'Relógios > Clássicos',
    description: 'Rolex Datejust 41mm em aço e ouro branco. Mostrador azul sunburst com índices romanos. Pulseira Jubilee. Luneta canelada em ouro branco. Calibre 3235. Perfeito para uso diário executivo.',
    price: 52000,
    stock_quantity: 2,
    image_url: 'https://content.rolex.com/dam/2024/upright-bba-with-shadow/m126334-0003.png',
    tags: 'rolex, datejust, azul, jubilee, executivo, versátil',
    active: true,
  },

  // PATEK PHILIPPE
  {
    tenant_id: [TENANT_ID],
    title: 'Patek Philippe Nautilus 5711/1A-010 (Usado)',
    brand: 'Patek Philippe',
    category: 'Relógios > Esportivos Luxo',
    description: 'RARIDADE! Patek Philippe Nautilus 5711 descontinuado em aço. Mostrador azul. Ano 2019, estado de novo (95%). Completo com caixa, papéis e garantia. Última oportunidade antes de preços explodirem ainda mais.',
    price: 320000,
    stock_quantity: 1,
    image_url: 'https://www.patek.com/modules/content/assets/img/content/default/nautilus.png',
    tags: 'patek, nautilus, 5711, descontinuado, aço, investimento, raro',
    active: true,
    features: JSON.stringify({
      ref: '5711/1A-010',
      year: 2019,
      condition: '95% - Estado de novo',
      box_papers: 'Completo',
      rarity: 'Modelo descontinuado (2021)',
      market_value: 'Mercado: R$ 400k+ (abaixo do mercado)',
    }),
  },

  // JEWELRY
  {
    tenant_id: [TENANT_ID],
    title: 'Anel Solitário Diamante 1.0ct D/VVS2 GIA',
    brand: 'Diamante Certificado',
    category: 'Joias > Anéis > Noivado',
    description: 'Anel solitário com diamante natural 1.0 quilate, cor D (incolor), pureza VVS2, lapidação Excellent. Certificado GIA. Engaste em ouro 18k branco. Perfeito para pedido de casamento.',
    price: 48000,
    stock_quantity: 1,
    image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    tags: 'diamante, noivado, anel, solitário, 1ct, GIA, ouro branco',
    active: true,
    features: JSON.stringify({
      diamond_specs: {
        carat: '1.00ct',
        color: 'D (Incolor - top)',
        clarity: 'VVS2 (muito puro)',
        cut: 'Excellent (brilho máximo)',
        shape: 'Redondo brilhante',
        certification: 'GIA (certificado incluído)',
      },
      setting: 'Ouro 18k branco, 6 garras clássicas',
      size: 'Tamanho ajustável sem custo',
    }),
  },

  {
    tenant_id: [TENANT_ID],
    title: 'Cartier Love Bracelet Ouro Rosa com Diamantes',
    brand: 'Cartier',
    category: 'Joias > Pulseiras',
    description: 'Icônico Love Bracelet da Cartier em ouro rosa 18k, cravejado com 10 diamantes. Acompanha chave e parafusadeira. Caixa e certificado Cartier. Tamanho 17 (ajustável).',
    price: 72000,
    stock_quantity: 1,
    image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    tags: 'cartier, love, pulseira, ouro rosa, diamantes, luxo',
    active: true,
  },

  {
    tenant_id: [TENANT_ID],
    title: 'Colar Riviera Diamantes 5.0ct Ouro Branco',
    brand: 'Alta Joalheria',
    category: 'Joias > Colares',
    description: 'Colar riviera com 52 diamantes naturais totalizando 5.0ct. Ouro branco 18k. Diamantes cor G-H, pureza VS. Comprimento 42cm. Peça espetacular para ocasiões especiais.',
    price: 95000,
    stock_quantity: 1,
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    tags: 'colar, riviera, diamantes, ouro branco, luxo, festa',
    active: true,
  },
]

// ============================================================================
// SALESPEOPLE - For assignment testing
// ============================================================================

const SALESPEOPLE = [
  {
    tenant_id: [TENANT_ID],
    name: 'Patricia Silva',
    phone: '+5511999998888',
    email: 'patricia@loja.com',
    specialization: 'Relógios de luxo',
    schedule: 'Segunda a Sexta: 10h-19h | Sábado: 10h-14h',
    active: true,
  },
  {
    tenant_id: [TENANT_ID],
    name: 'Ricardo Mendes',
    phone: '+5511999997777',
    email: 'ricardo@loja.com',
    specialization: 'Joias e diamantes',
    schedule: 'Terça a Sábado: 11h-20h',
    active: true,
  },
  {
    tenant_id: [TENANT_ID],
    name: 'Juliana Costa',
    phone: '+5511999996666',
    email: 'juliana@loja.com',
    specialization: 'Relógios vintage e usados',
    schedule: 'Segunda a Sexta: 9h-18h',
    active: true,
  },
]

// ============================================================================
// STORE AVAILABILITY - Slot configuration
// ============================================================================

const STORE_AVAILABILITY = {
  tenant_id: [TENANT_ID],
  weekday_slots: JSON.stringify([
    { time: '10:00', label: 'Manhã (10h)', capacity: 2 },
    { time: '14:00', label: 'Tarde (14h)', capacity: 3 },
    { time: '18:00', label: 'Final da tarde (18h)', capacity: 2 },
  ]),
  weekend_slots: JSON.stringify([
    { time: '10:00', label: 'Manhã (10h)', capacity: 2 },
    { time: '14:00', label: 'Tarde (14h)', capacity: 1 },
  ]),
  blackout_dates: JSON.stringify(['2025-12-25', '2025-01-01']),
  advance_booking_days: 30,
  min_notice_hours: 2,
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

async function setupTestData() {
  console.log('🚀 Starting test data setup...\n')

  try {
    // 1. Brand Knowledge
    console.log('📚 Creating Brand Knowledge...')
    for (const knowledge of BRAND_KNOWLEDGE) {
      await atCreate('BrandKnowledge', knowledge)
      console.log(`  ✅ ${knowledge.brand} ${knowledge.model}`)
    }

    // 2. Catalog Products with Embeddings
    console.log('\n🏷️  Creating Catalog Products...')
    for (const product of CATALOG_PRODUCTS) {
      // Generate embedding for semantic search
      const embeddingText = `${product.title} ${product.description} ${product.tags}`
      const embedding = await generateEmbedding(embeddingText)

      await atCreate('Catalog', {
        ...product,
        embedding: JSON.stringify(embedding),
        created_at: new Date().toISOString(),
      })
      console.log(`  ✅ ${product.title} (com embedding)`)
    }

    // 3. Salespeople
    console.log('\n👥 Creating Salespeople...')
    for (const salesperson of SALESPEOPLE) {
      await atCreate('Salespeople', {
        ...salesperson,
        created_at: new Date().toISOString(),
      })
      console.log(`  ✅ ${salesperson.name} - ${salesperson.specialization}`)
    }

    // 4. Store Availability
    console.log('\n📅 Setting up Store Availability...')
    await atCreate('StoreAvailability', {
      ...STORE_AVAILABILITY,
      created_at: new Date().toISOString(),
    })
    console.log('  ✅ Horários configurados')

    console.log('\n✨ Test data setup complete!')
    console.log('\n📱 Ready to test WhatsApp scenarios:')
    console.log('   1. Ask about Rolex → Get specs → Schedule visit')
    console.log('   2. Ask about jewelry for wife → Get diamond details')
    console.log('   3. Send watch/jewelry photo → AI recognizes → Adds to interests')
    console.log('   4. Sell your watch → Verification flow → Dashboard review')
    console.log('   5. Dashboard → Assign salesperson → View analytics')

  } catch (error) {
    console.error('❌ Error setting up test data:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  setupTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { setupTestData }
