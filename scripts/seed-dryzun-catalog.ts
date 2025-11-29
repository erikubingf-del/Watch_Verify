import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    const tenantSlug = 'dryzun'
    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
    })

    if (!tenant) {
        console.error(`Tenant ${tenantSlug} not found. Please run setup-dryzun.ts first.`)
        process.exit(1)
    }

    console.log(`Seeding catalog for tenant: ${tenant.name} (${tenant.id})`)

    // 1. Load Scraped Jewelry Data
    const jewelryPath = path.join(process.cwd(), 'dryzun_jewelry.json')
    let jewelryData = []
    try {
        const rawData = fs.readFileSync(jewelryPath, 'utf-8')
        jewelryData = JSON.parse(rawData)
    } catch (error) {
        console.warn('Could not load dryzun_jewelry.json, skipping jewelry seed.', error)
    }

    // 2. Define Hardcoded Watch Data (Rolex & Cartier)
    // Using placeholder images from reliable sources or generic luxury watch placeholders
    const watchData = [
        // Rolex
        {
            title: 'Rolex Submariner Date',
            description: 'Oystersteel, Cerachrom bezel insert in black ceramic. The archetype of the divers\' watch.',
            price: 'R$ 80.000,00', // Approximate
            imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic luxury watch image
            category: 'Rolex',
            fulfillmentOptions: ['delivery', 'pickup']
        },
        {
            title: 'Rolex Daytona "Panda"',
            description: 'Oystersteel, white dial with black counters. The ultimate chronograph.',
            price: 'R$ 120.000,00', // Approximate
            imageUrl: 'https://images.unsplash.com/photo-1622434641406-a158123450f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic chronograph
            category: 'Rolex',
            fulfillmentOptions: ['pickup'] // High value, pickup only
        },
        {
            title: 'Rolex Datejust 36 Blue Dial',
            description: 'Oystersteel and white gold, bright blue dial. The classic watch of reference.',
            price: 'R$ 65.000,00',
            imageUrl: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic blue dial watch
            category: 'Rolex',
            fulfillmentOptions: ['delivery', 'pickup']
        },
        {
            title: 'Rolex GMT-Master II "Pepsi"',
            description: 'Oystersteel, red and blue Cerachrom bezel. Designed for navigation.',
            price: 'R$ 95.000,00',
            imageUrl: 'https://images.unsplash.com/photo-1594534475889-b6b10a91d869?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic GMT style
            category: 'Rolex',
            fulfillmentOptions: ['pickup']
        },

        // Cartier
        {
            title: 'Cartier Santos de Cartier Large',
            description: 'Steel case, automatic movement. A tribute to the aviator Alberto Santos-Dumont.',
            price: 'R$ 48.000,00',
            imageUrl: 'https://images.unsplash.com/photo-1620625515032-6ed0c1790c75?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic square watch
            category: 'Cartier',
            fulfillmentOptions: ['delivery', 'pickup']
        },
        {
            title: 'Cartier Tank Must',
            description: 'Steel case, quartz movement. The elegance of a timeless design.',
            price: 'R$ 25.000,00',
            imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic dress watch
            category: 'Cartier',
            fulfillmentOptions: ['delivery', 'pickup']
        },
        {
            title: 'Cartier Ballon Bleu 36mm',
            description: 'Steel case, mechanical movement with automatic winding. Floating like a balloon.',
            price: 'R$ 42.000,00',
            imageUrl: 'https://images.unsplash.com/photo-1629581353390-d2969da98302?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Generic round watch
            category: 'Cartier',
            fulfillmentOptions: ['delivery', 'pickup']
        }
    ]

    // 3. Upsert Products
    const allProducts = [
        ...jewelryData.map(j => ({ ...j, category: 'Jewelry', fulfillmentOptions: ['delivery', 'pickup'] })),
        ...watchData
    ]

    for (const product of allProducts) {
        // Clean price string to number if possible, or store as 0 and keep string in description or separate field?
        // The Product model has 'price' as Float.
        // 'Sob consulta' -> 0
        // 'R$ 80.000,00' -> 80000.00

        let priceValue = 0
        if (product.price && product.price !== 'Sob consulta') {
            const numericString = product.price.replace(/[^0-9,]/g, '').replace(',', '.')
            priceValue = parseFloat(numericString)
        }

        // Check if product exists by title
        const existingProduct = await prisma.product.findFirst({
            where: {
                tenantId: tenant.id,
                title: product.title
            }
        })

        if (existingProduct) {
            await prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                    description: product.description,
                    price: priceValue,
                    imageUrl: product.imageUrl,
                    category: product.category,
                    stockQuantity: 1,
                    fulfillmentOptions: product.fulfillmentOptions
                }
            })
            console.log(`Updated: ${product.title}`)
        } else {
            await prisma.product.create({
                data: {
                    tenantId: tenant.id,
                    title: product.title,
                    description: product.description,
                    price: priceValue,
                    imageUrl: product.imageUrl,
                    category: product.category,
                    stockQuantity: 1,
                    fulfillmentOptions: product.fulfillmentOptions
                }
            })
            console.log(`Created: ${product.title}`)
        }
    }

    console.log('Catalog seeding complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
