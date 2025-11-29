import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const BRAND_DATA = [
    {
        "brand": "Rolex",
        "brand_core_profile": {
            "brand_name": "Rolex",
            "founded": "1905, London, United Kingdom",
            "founders": "Hans Wilsdorf & Alfred Davis",
            "official_heritage_summary": "Rolex is a Swiss luxury watchmaker known for precision, chronometric excellence, and tool-watch innovation. The brand moved to Geneva in 1919, establishing itself as a pioneer of waterproof cases, automatic movements, and reliability used in exploration and professional use.",
            "brand_mission": "Create high-precision, reliable, and enduring timepieces for demanding conditions.",
            "core_values": ["Precision", "Durability", "Functionality", "Reliability", "Timeless Design"]
        },
        "official_history": {
            "milestones": [
                "1905: Wilsdorf & Davis founded",
                "1908: Rolex trademark registered",
                "1926: Oyster waterproof case",
                "1931: Perpetual rotor automatic movement",
                "1953: Submariner",
                "1955: GMT-Master",
                "1956: Day-Date",
                "1963: Daytona",
                "1971: Explorer II"
            ],
            "narrative": "Rolex builds professional tool watches that supported explorers, divers, pilots, and scientists. Innovation, robustness, and precision define the brand's story."
        },
        "prohibited_history": {
            "forbidden": [
                "Speculation about waitlists or allocation systems",
                "Production numbers, internal quotas",
                "Secondary-market pricing or resellers",
                "Rumors about artificial scarcity",
                "Conspiracy theories about strategy"
            ],
            "sensitive": [
                "Hans Wilsdorf personal financial details",
                "Rolex philanthropic foundation specifics beyond official disclosures"
            ]
        },
        "approved_brand_talking_points": {
            "craftsmanship": [
                "In-house movements",
                "Chronometer certification",
                "904L Oystersteel",
                "Rigorous testing"
            ],
            "design_codes": ["Oyster case", "Cyclops lens", "Fluted bezel", "Chromalight"],
            "materials": ["Oystersteel", "18k gold", "Rolesor", "Cerachrom", "Everose"],
            "technical_achievements": [
                "Waterproofing",
                "Perpetual rotor",
                "Parachrom hairspring",
                "Superlative Chronometer"
            ],
            "iconic_products": [
                "Submariner",
                "Daytona",
                "Datejust",
                "Day-Date",
                "GMT-Master II",
                "Explorer",
                "Yacht-Master",
                "Sea-Dweller"
            ],
            "approved_phrases": [
                "A crown for every achievement.",
                "Rolex watches are built to last.",
                "Precision and durability define the brand."
            ]
        },
        "product_knowledge": {
            "collections": [
                "Oyster Perpetual",
                "Datejust",
                "Day-Date",
                "Submariner",
                "GMT-Master II",
                "Explorer",
                "Yacht-Master",
                "Sea-Dweller",
                "Daytona",
                "Sky-Dweller",
                "Air-King"
            ],
            "must_emphasize": [
                "Reliability",
                "Robust construction",
                "Exploration heritage",
                "Certified precision",
                "Timeless design"
            ],
            "must_not_emphasize": [
                "Resale value",
                "Market scarcity",
                "Investment potential",
                "Unauthorized service centers"
            ]
        },
        "design_language": {
            "signature_shapes": ["Oyster case", "Round dial", "Fluted bezel"],
            "colors_materials": ["Rolex green", "Everose gold"],
            "keywords": ["Precision", "Enduring", "Functional luxury"],
            "traits": ["Legible dials", "Harmonious proportions"]
        },
        "knowledge_filter": {
            "allowed_sources": ["Rolex.com", "Official catalogs", "Press releases"],
            "blocked_sources": ["Forums", "Blogs with speculation", "Grey-market data"],
            "official_correction_phrase": "According to Rolex’s official communication, there is no confirmation of this information. Here is the verified version."
        },
        "sensitive_areas": {
            "ambassadors": "Only official ambassadors may be mentioned.",
            "availability": "Use neutral phrasing such as 'availability varies by retailer'."
        },
        "key_phrases": [
            "Rolex emphasizes precision and durability.",
            "The Oyster case is core to the brand.",
            "Rolex movements achieve exceptional performance."
        ],
        "quick_reference": {
            "highlight": ["Innovation", "Reliability", "Tool-watch heritage"],
            "avoid": ["Speculation", "Scarcity discussion"],
            "safe": ["History", "Materials", "Precision"],
            "forbidden": ["Rumors", "Production details"]
        }
    },
    {
        "brand": "Cartier",
        "brand_core_profile": {
            "brand_name": "Cartier",
            "founded": "1847, Paris, France",
            "founder": "Louis-François Cartier",
            "official_heritage_summary": "Cartier is a French maison known for jewelry mastery, creative watchmaking, and iconic shapes. Since the 19th century, Cartier has served royalty and cultural icons while shaping the aesthetic of luxury.",
            "brand_mission": "Create timeless pieces of elegance defined by French refinement, creativity, and craftsmanship.",
            "core_values": ["Elegance", "Creativity", "Refinement", "Artistry"]
        },
        "official_history": {
            "milestones": [
                "1847: Maison founded",
                "Early 1900s: Santos and Tank",
                "1914: Panther motif",
                "1930–50s: Global influence expansion"
            ],
            "narrative": "Cartier defines its legacy through artistic creativity and iconic shapes such as the Tank, Santos, and Panthère."
        },
        "prohibited_history": {
            "forbidden": [
                "Unverified celebrity stories",
                "Controversies related to aristocracy",
                "Rumors about manufacturing origins",
                "Speculation on exclusivity or pricing"
            ],
            "sensitive": [
                "Family disputes",
                "Ownership transitions not officially detailed"
            ]
        },
        "approved_brand_talking_points": {
            "craftsmanship": [
                "High jewelry techniques",
                "Stone selection",
                "Polished cases",
                "Exceptional finishing"
            ],
            "design_codes": [
                "Panther motif",
                "Geometric shapes",
                "Visible screws (Santos)",
                "Rectangular Tank silhouette"
            ],
            "materials": [
                "Cartier gold alloys",
                "Precious stones",
                "Polished steel",
                "Cabochon crown"
            ],
            "iconic_products": [
                "Tank",
                "Santos",
                "Ballon Bleu",
                "Panthère",
                "Pasha",
                "Baignoire",
                "Trinity jewelry"
            ],
            "approved_phrases": [
                "Cartier is the maison of shape.",
                "Elegance through artistic craftsmanship.",
                "Cartier blends watchmaking and high jewelry."
            ]
        },
        "product_knowledge": {
            "collections": {
                "watches": [
                    "Santos",
                    "Tank",
                    "Ballon Bleu",
                    "Pasha",
                    "Panthère",
                    "Drive",
                    "Baignoire"
                ],
                "jewelry": ["Love", "Juste un Clou", "Trinity", "Panthère"],
                "accessories": ["Leather goods", "Eyewear", "Fragrances"]
            },
            "must_emphasize": [
                "French elegance",
                "Iconic shapes",
                "Jewelry-level craft",
                "Symbolism behind collections"
            ],
            "must_not_emphasize": [
                "Resale speculation",
                "Production numbers",
                "Rumors about materials",
                "Unofficial celebrity associations"
            ]
        },
        "design_language": {
            "signature_shapes": ["Rectangle (Tank)", "Square with screws (Santos)", "Round dome (Ballon Bleu)"],
            "motifs": ["Panthère", "Trinity rings", "Cabochon crown"],
            "keywords": ["Parisian elegance", "Artistic identity", "Refinement"]
        },
        "knowledge_filter": {
            "allowed_sources": ["Cartier.com", "Official catalogs", "Pressroom"],
            "blocked_sources": ["Fan theories", "Speculative blogs"],
            "official_correction_phrase": "This information does not appear in Cartier’s official communication. Here is the verified version."
        },
        "sensitive_areas": {
            "celebrity_usage": "Only official ambassadors may be cited.",
            "availability": "Use 'subject to availability'."
        },
        "key_phrases": [
            "Cartier is the maison of shape.",
            "Iconic elegance rooted in craft.",
            "A fusion of watchmaking and jewelry expertise."
        ],
        "quick_reference": {
            "highlight": ["Shapes", "Elegance", "Jewelry heritage"],
            "avoid": ["Rumors", "Speculation"],
            "safe": ["Design codes", "Official history"],
            "forbidden": ["Pricing speculation", "Unofficial stories"]
        }
    },
    {
        "brand": "Dryzun",
        "brand_core_profile": {
            "brand_name": "Dryzun",
            "founded": "1967, São Paulo, Brazil",
            "founders": "Família Dryzun",
            "official_heritage_summary": "Dryzun is a Brazilian jewelry house with over five decades of tradition, known for authorial design, refinement, and unique creations. Born in Shopping Iguatemi, the brand became a national reference in luxury jewelry.",
            "brand_mission": "Transform precious metals and stones into expressions of life, elegance, and personal meaning.",
            "core_values": ["Design innovation", "Sophistication", "Exclusivity", "Versatility"]
        },
        "official_history": {
            "milestones": [
                "1967: First store at Shopping Iguatemi",
                "1980s: Introduction of fashion-forward collections",
                "1990s: Launch of minimalistic 'Ponto de Luz'",
                "2010s: Reinforcement of contemporary brand identity",
                "2019: Becomes official Rolex retailer",
                "2025: Celebrates 60 years and expands with IWC"
            ],
            "narrative": "Dryzun has continuously redefined Brazilian jewelry through innovation, sophistication, and authorial design. Its legacy blends tradition with contemporary elegance."
        },
        "prohibited_history": {
            "forbidden": [
                "Rumors about family origins",
                "Internal production or logistics details",
                "Sales numbers, margins, or quotas",
                "Unverified market speculation"
            ],
            "sensitive": [
                "Commercial strategies",
                "Brand partnership negotiations beyond official announcements"
            ]
        },
        "approved_brand_talking_points": {
            "themes": [
                "Authorial jewelry design",
                "Use of gold and precious stones",
                "Versatile collections for different audiences",
                "Fashion inspiration and trend-setting",
                "Luxury curation including high-end watches"
            ],
            "iconic_elements": [
                "Medalha da Vida",
                "Better Together",
                "Bem Me Quero",
                "Toque de Amor",
                "Make a Wish",
                "Linha da Vida",
                "Emerald Cut",
                "Oceano",
                "Céu Dryzun",
                "Duetto"
            ]
        },
        "product_knowledge": {
            "collections": [
                "Rings",
                "Earrings",
                "Necklaces",
                "Pendants",
                "Bracelets",
                "High Jewelry",
                "Religious pieces",
                "Masculine jewelry",
                "Zodiac jewelry",
                "Children's jewelry"
            ],
            "materials": [
                "Yellow gold",
                "White gold",
                "Rose gold",
                "Silver",
                "Diamonds",
                "Rubies",
                "Emeralds",
                "Sapphires",
                "Turmalines",
                "Topaz",
                "Ametista",
                "Pérolas"
            ],
            "must_emphasize": [
                "Authorial design and exclusivity",
                "Variety of metals and stones",
                "Versatility for different styles",
                "Brazilian heritage",
                "Curated selection of luxury watches"
            ],
            "must_not_emphasize": [
                "Production numbers",
                "Internal supply chain",
                "Sales volumes",
                "Speculation about sourcing"
            ]
        },
        "design_language": {
            "style": "Refined elegance with contemporary creativity",
            "identity": "Classic-meets-modern jewelry with expressive symbolism",
            "keywords": ["Elegance", "Modernity", "Expression", "Personal meaning"]
        },
        "knowledge_filter": {
            "allowed_sources": ["dryzun.com.br"],
            "blocked_sources": ["Rumor sites", "Speculation forums"],
            "official_correction_phrase": "Essa informação não consta na comunicação oficial da Dryzun. Aqui está o que a marca afirma."
        },
        "sensitive_areas": {
            "celebrity_usage": "Mention only if official.",
            "availability": "Use 'sujeito à disponibilidade'.",
            "materials": "Mention only stones and metals listed officially."
        },
        "key_phrases": [
            "Dryzun traduz em ouro e pedras preciosas uma maneira de ver e viver.",
            "Desde 1967, tradição e design autoral.",
            "Joias versáteis para cada momento da vida."
        ],
        "quick_reference": {
            "highlight": ["Design autoral", "Elegância", "Versatilidade", "História brasileira"],
            "avoid": ["Rumores", "Dados não oficiais"],
            "safe": ["História", "Coleções", "Materiais"],
            "forbidden": ["Informações internas", "Especulação"]
        }
    }
]

function jsonToMarkdown(data: any): string {
    let md = `# ${data.brand}\n\n`

    if (data.brand_core_profile) {
        md += `## Core Profile\n`
        md += `- **Founded**: ${data.brand_core_profile.founded}\n`
        md += `- **Mission**: ${data.brand_core_profile.brand_mission}\n`
        md += `- **Values**: ${data.brand_core_profile.core_values.join(', ')}\n`
        md += `- **Summary**: ${data.brand_core_profile.official_heritage_summary}\n\n`
    }

    if (data.official_history) {
        md += `## History\n`
        md += `${data.official_history.narrative}\n\n`
        md += `### Milestones\n`
        data.official_history.milestones.forEach((m: string) => md += `- ${m}\n`)
        md += '\n'
    }

    if (data.approved_brand_talking_points) {
        md += `## Talking Points\n`
        const points = data.approved_brand_talking_points
        if (points.craftsmanship) {
            md += `### Craftsmanship\n`
            points.craftsmanship.forEach((p: string) => md += `- ${p}\n`)
        }
        if (points.themes) {
            md += `### Themes\n`
            points.themes.forEach((p: string) => md += `- ${p}\n`)
        }
        if (points.approved_phrases) {
            md += `### Key Phrases\n`
            points.approved_phrases.forEach((p: string) => md += `- "${p}"\n`)
        }
        md += '\n'
    }

    if (data.product_knowledge) {
        md += `## Product Knowledge\n`
        const pk = data.product_knowledge
        if (Array.isArray(pk.collections)) {
            md += `### Collections\n`
            pk.collections.forEach((c: string) => md += `- ${c}\n`)
        } else if (typeof pk.collections === 'object') {
            md += `### Collections\n`
            Object.entries(pk.collections).forEach(([key, values]: [string, any]) => {
                md += `- **${key}**: ${values.join(', ')}\n`
            })
        }

        if (pk.must_emphasize) {
            md += `### Emphasize\n`
            pk.must_emphasize.forEach((p: string) => md += `- ${p}\n`)
        }
        md += '\n'
    }

    if (data.prohibited_history) {
        md += `## Prohibited Topics\n`
        if (data.prohibited_history.forbidden) {
            data.prohibited_history.forbidden.forEach((p: string) => md += `- ⛔ ${p}\n`)
        }
        md += '\n'
    }

    return md
}

async function main() {
    console.log('🚀 Starting Dryzun Setup...')

    // 1. Find or Create Tenant
    const tenantSlug = 'dryzun'
    let tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug }
    })

    if (!tenant) {
        console.log('Creating new tenant...')
        tenant = await prisma.tenant.create({
            data: {
                name: 'Dryzun Joalheiros',
                slug: tenantSlug,
                config: {}
            }
        })
    } else {
        console.log('Found existing tenant:', tenant.id)
    }

    // 2. Update Configuration
    console.log('Updating configuration...')
    const newConfig = {
        verification_enabled: true,
        offers_purchase: true,
        allowed_brands: ['Rolex', 'Cartier', 'Dryzun'],
        welcome_message: "Olá! Bem-vindo à Dryzun. Sou seu assistente virtual especializado em alta joalheria e relógios de luxo. Como posso ajudar você hoje?",
        bot_instructions: `You are a specialized assistant for Dryzun, a prestigious Brazilian jewelry house.
    - Tone: Elegant, sophisticated, warm, and professional.
    - Focus: High jewelry, authorial design, and luxury watches (Rolex, Cartier).
    - Language: Portuguese (Brazil).
    - Context: Dryzun has a 50+ year history starting at Shopping Iguatemi.
    - Sales: You can assist with jewelry selection and schedule appointments for watch viewing.
    - Verification: You can help verify watches for buyback (Rolex/Cartier).`
    }

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            config: {
                ...(tenant.config as object),
                ...newConfig
            }
        }
    })

    // 3. Process Brand Knowledge
    console.log('Processing brand knowledge...')

    for (const brandData of BRAND_DATA) {
        const brandName = brandData.brand
        console.log(`Processing ${brandName}...`)

        const markdownContent = jsonToMarkdown(brandData)

        // Generate Embedding for the whole content (or chunks)
        const textChunks = markdownContent.split(/\n\s*\n/).filter(c => c.trim().length > 50)

        try {
            for (const chunk of textChunks) {
                // Add brand context to chunk for better embedding
                const contextChunk = `${brandName} Knowledge: ${chunk}`
                const { embedding } = await generateEmbedding(contextChunk)
                const embeddingString = `[${embedding.join(',')}]`

                await prisma.$executeRaw`
                    INSERT INTO knowledge_base (id, "tenantId", title, content, source, embedding, "updatedAt")
                    VALUES (gen_random_uuid(), ${tenant.id}, ${brandName + ' Brand Guide'}, ${chunk}, 'setup-script', ${embeddingString}::vector, NOW())
                `
            }
        } catch (error) {
            console.warn(`Failed to ingest knowledge for ${brandName} (likely missing API key). Skipping.`, error)
        }
    }

    console.log('✅ Setup Complete!')
    console.log(`Tenant ID: ${tenant.id}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
