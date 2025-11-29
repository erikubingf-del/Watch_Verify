import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Applying manual schema updates...')

    try {
        // Product columns
        await prisma.$executeRaw`ALTER TABLE products ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`
        console.log('Added imageUrl to products')

        await prisma.$executeRaw`ALTER TABLE products ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER DEFAULT 1;`
        console.log('Added stockQuantity to products')

        await prisma.$executeRaw`ALTER TABLE products ADD COLUMN IF NOT EXISTS "fulfillmentOptions" TEXT[];`
        console.log('Added fulfillmentOptions to products')

        // User columns
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS "shiftSchedule" JSONB;`
        console.log('Added shiftSchedule to users')

        // KnowledgeBase table
        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "knowledge_base" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "source" TEXT,
        "tags" TEXT[],
        "embedding" vector(1536),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
      );
    `
        console.log('Created knowledge_base table')

        // Add FK if not exists (handling "if not exists" for constraint is tricky in pure SQL, 
        // but we can try-catch or just ignore if it fails)
        try {
            await prisma.$executeRaw`
          ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_tenantId_fkey" 
          FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `
            console.log('Added FK to knowledge_base')
        } catch (e) {
            // Ignore if constraint already exists
            console.log('FK likely already exists')
        }

    } catch (error) {
        console.error('Error applying schema updates:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
