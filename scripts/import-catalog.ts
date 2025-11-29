import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
    const args = process.argv.slice(2)
    const filePath = args[0] || 'catalog_template.csv'
    const tenantId = args[1]

    if (!tenantId) {
        console.error('Usage: tsx scripts/import-catalog.ts <file_path> <tenant_id>')
        process.exit(1)
    }

    console.log(`Reading catalog from ${filePath} for tenant ${tenantId}...`)

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        })

        console.log(`Found ${records.length} records. Importing...`)

        let imported = 0
        let errors = 0

        for (const record of records) {
            try {
                await prisma.product.create({
                    data: {
                        tenantId,
                        title: record.title,
                        brand: record.brand || null,
                        description: record.description,
                        category: record.category,
                        price: record.price ? parseFloat(record.price) : null,
                        tags: record.tags ? record.tags.split(',').map((t: string) => t.trim()) : [],
                        imageUrl: record.imageUrl || null,
                        stockQuantity: record.stockQuantity ? parseInt(record.stockQuantity) : 0,
                        isActive: record.isActive === 'true' || record.isActive === true,
                        fulfillmentOptions: record.fulfillment ? record.fulfillment.split(',').map((f: string) => f.trim().toLowerCase()) : [],
                    }
                })
                imported++
            } catch (err) {
                console.error(`Failed to import ${record.title}:`, err)
                errors++
            }
        }

        console.log(`Import complete. Success: ${imported}, Errors: ${errors}`)

    } catch (error) {
        console.error('Error reading file:', error)
        process.exit(1)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
