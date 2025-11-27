import { PrismaClient } from '@prisma/client'
import { atSelect } from '../utils/airtable'
import { generateEmbedding } from '../lib/embeddings'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient()

async function migrateCatalog() {
    console.log('⌚ Starting Catalog Migration with Embeddings...')

    try {
        // 1. Get all tenants to map IDs
        const tenants = await prisma.tenant.findMany()
        const tenantMap = new Map(tenants.map(t => [t.name, t.id])) // Map by Name for now, ideally by Airtable ID if we stored it

        // Fallback: Try to match by Airtable ID if we can infer it or just use the first tenant for testing
        // In a real migration, we'd have stored the Airtable ID in the Tenant model.
        // For this script, we'll assume the tenant migration ran and we can look up by name or just process all.

        const atCatalog = await atSelect('Catalog')
        console.log(`Found ${atCatalog.length} products in Airtable.`)

        for (const record of atCatalog) {
            const fields = record.fields as any

            // Find tenant ID (this is tricky without the map, assuming we have a way to link)
            // For now, we'll skip if we can't find the tenant, or use a placeholder if testing
            // In production, we'd query the Tenant by the Airtable ID stored in a migration_id field

            // Let's assume we can find the tenant by querying Airtable Tenants first to get the name
            const atTenant = await atSelect('Tenants', { filterByFormula: `RECORD_ID()='${fields.tenant_id?.[0]}'` })
            if (atTenant.length === 0) continue

            const tenantName = atTenant[0].fields.name
            const tenant = await prisma.tenant.findFirst({ where: { name: tenantName } })

            if (!tenant) {
                console.warn(`Tenant not found for product: ${fields.title}`)
                continue
            }

            console.log(`Processing: ${fields.title}`)

            // Generate Embedding
            const textToEmbed = `${fields.title}\n${fields.description}\n${fields.category}\n${fields.tags?.join(', ')}`
            const { embedding } = await generateEmbedding(textToEmbed)

            // Insert into Postgres
            // Note: Prisma doesn't support vector types natively in create() yet without raw SQL or typed extensions
            // We'll use $executeRaw for the vector insertion

            const productId = crypto.randomUUID()

            await prisma.$executeRaw`
        INSERT INTO products (id, "tenantId", title, description, category, price, tags, "isActive", metadata, embedding, "createdAt", "updatedAt")
        VALUES (
          ${productId},
          ${tenant.id},
          ${fields.title},
          ${fields.description || ''},
          ${fields.category || 'other'},
          ${fields.price},
          ${fields.tags || []},
          ${fields.active !== false},
          ${JSON.stringify({ image_url: fields.image_url, delivery_options: fields.delivery_options })},
          ${JSON.stringify(embedding)}::vector,
          NOW(),
          NOW()
        );
      `
        }

        console.log('✅ Catalog migration complete!')

    } catch (error) {
        console.error('❌ Migration failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

migrateCatalog()
