#!/usr/bin/env tsx
/**
 * Verify Prisma Memory System
 *
 * Tests:
 * 1. Adding memories to PostgreSQL (pgvector)
 * 2. Semantic search using cosine similarity
 */

import dotenv from 'dotenv'

// Load env vars first
dotenv.config({ path: '.env' })

// Patch DATABASE_URL protocol for Prisma Accelerate if needed
if (process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('prisma+postgres://', 'prisma://')
    console.log('DEBUG: Patched DATABASE_URL to use prisma:// protocol')
}

console.log('DEBUG: DATABASE_URL protocol:', process.env.DATABASE_URL?.split(':')[0])
console.log('DEBUG: DIRECT_URL protocol:', process.env.DIRECT_URL?.split(':')[0])

// Import modules AFTER patching env
import { addMemory, searchMemories } from '../lib/memory'
import { prisma } from '../lib/prisma'

async function main() {
    console.log('🧪 Starting Memory System Verification...')

    // 1. Setup Test Data
    const tenantId = 'test-tenant-' + Date.now()
    const phone = '+5511999999999'

    console.log(`\n📝 Creating test tenant and customer...`)

    try {
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: tenantId,
                whatsappNumber: phone,
            }
        })

        const customer = await prisma.customer.create({
            data: {
                tenantId: tenant.id,
                phone: phone,
                name: 'Test Customer',
            }
        })

        console.log(`✅ Created customer: ${customer.id}`)

        try {
            // 2. Add Memories
            console.log(`\n🧠 Adding memories...`)

            const facts = [
                "O cliente gosta de relógios de mergulho.",
                "O orçamento é entre 50 e 60 mil reais.",
                "Prefere a marca Rolex, especificamente Submariner.",
                "Não gosta de relógios de ouro, prefere aço.",
                "Pratica mergulho ocasionalmente."
            ]

            for (const fact of facts) {
                await addMemory(customer.id, fact, 'manual', 1.0)
                console.log(`   + Added: "${fact}"`)
            }

            // 3. Test Search
            console.log(`\n🔎 Testing Semantic Search...`)

            const queries = [
                "Qual o orçamento?",
                "Que tipo de relógio ele gosta?",
                "Ele gosta de ouro?",
                "Qual esporte ele pratica?"
            ]

            for (const query of queries) {
                console.log(`\n   Query: "${query}"`)
                const results = await searchMemories(customer.id, query, 2, 0.6)

                if (results.length === 0) {
                    console.log(`   ❌ No results found`)
                } else {
                    results.forEach(r => {
                        console.log(`   ✅ Found: "${r.fact}" (Similarity: ${r.similarity?.toFixed(3)})`)
                    })
                }
            }

        } catch (error) {
            console.error('❌ Error during test execution:', error)
        } finally {
            // Cleanup
            console.log(`\n🧹 Cleaning up...`)
            await prisma.customerMemory.deleteMany({ where: { customerId: customer.id } })
            await prisma.customer.delete({ where: { id: customer.id } })
            await prisma.tenant.delete({ where: { id: tenant.id } })
            console.log(`✅ Cleanup complete`)
        }
    } catch (error) {
        console.error('❌ Error creating test data:', error)
    }
}

main()
