import { PrismaClient } from '@prisma/client'
import { atSelect } from '../utils/airtable'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' }) // Load Airtable keys
dotenv.config() // Load Database URL

const prisma = new PrismaClient()

async function migrate() {
  console.log('🚀 Starting migration from Airtable to Postgres...')

  try {
    // 1. Migrate Tenants
    console.log('📦 Migrating Tenants...')
    const atTenants = await atSelect('Tenants')
    const tenantMap = new Map<string, string>() // Airtable ID -> Postgres ID

    for (const record of atTenants) {
      const fields = record.fields as any
      
      // Generate a slug if not present
      const slug = fields.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + record.id.substring(0, 4)

      const tenant = await prisma.tenant.create({
        data: {
          name: fields.name,
          slug: slug,
          whatsappNumber: fields.twilio_number,
          isActive: fields.active !== false,
          config: {
            logo_url: fields.logo_url,
            primary_color: fields.primary_color,
          },
        },
      })
      
      tenantMap.set(record.id, tenant.id)
      console.log(`   ✅ Migrated tenant: ${fields.name}`)
    }

    // 2. Migrate Users (Salespeople + Admin)
    console.log('👤 Migrating Users...')
    
    // Fetch Users table (Admins)
    const atUsers = await atSelect('Users')
    for (const record of atUsers) {
      const fields = record.fields as any
      const tenantId = tenantMap.get(fields.tenant_id?.[0])
      
      if (!tenantId) {
        console.warn(`   ⚠️ Skipping user ${fields.email}: Tenant not found`)
        continue
      }

      await prisma.user.create({
        data: {
          tenantId,
          email: fields.email,
          passwordHash: fields.password_hash || 'placeholder_hash',
          name: fields.name,
          role: (fields.role || 'ADMIN').toUpperCase(),
          isActive: fields.active !== false,
        },
      })
    }

    // Fetch Salespeople table
    try {
      const atSalespeople = await atSelect('Salespeople')
      for (const record of atSalespeople) {
        const fields = record.fields as any
        const tenantId = tenantMap.get(fields.tenant_id?.[0])
        
        if (!tenantId) continue

        // Check if user already exists (by email or phone)
        const existing = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: fields.email },
              { phone: fields.phone }
            ]
          }
        })

        if (!existing) {
          await prisma.user.create({
            data: {
              tenantId,
              email: fields.email || `sales-${record.id}@placeholder.com`,
              passwordHash: 'placeholder_hash',
              name: fields.name,
              role: 'SALESPERSON',
              phone: fields.phone,
              whatsapp: fields.whatsapp,
              isActive: fields.active !== false,
            },
          })
        }
      }
    } catch (e) {
      console.log('   ℹ️ Salespeople table not found or empty')
    }

    // 3. Migrate Customers
    console.log('👥 Migrating Customers...')
    const atCustomers = await atSelect('Customers')
    
    for (const record of atCustomers) {
      const fields = record.fields as any
      const tenantId = tenantMap.get(fields.tenant_id?.[0])
      
      if (!tenantId || !fields.phone) continue

      try {
        await prisma.customer.create({
          data: {
            tenantId,
            phone: fields.phone,
            name: fields.name,
            email: fields.email,
            profile: {
              last_interest: fields.last_interest,
              interests: fields.interests,
            },
            createdAt: fields.created_at ? new Date(fields.created_at) : new Date(),
          },
        })
      } catch (e) {
        console.warn(`   ⚠️ Failed to migrate customer ${fields.phone}: ${e.message}`)
      }
    }

    // 4. Migrate Catalog (Products)
    console.log('⌚ Migrating Catalog...')
    const atCatalog = await atSelect('Catalog')
    
    for (const record of atCatalog) {
      const fields = record.fields as any
      const tenantId = tenantMap.get(fields.tenant_id?.[0])
      
      if (!tenantId) continue

      await prisma.product.create({
        data: {
          tenantId,
          title: fields.title,
          description: fields.description || '',
          category: fields.category || 'other',
          price: fields.price,
          tags: fields.tags || [],
          isActive: fields.active !== false,
          metadata: {
            image_url: fields.image_url,
            delivery_options: fields.delivery_options,
          },
          // Note: Embeddings migration requires pgvector setup, skipping for now
        },
      })
    }

    console.log('✅ Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
