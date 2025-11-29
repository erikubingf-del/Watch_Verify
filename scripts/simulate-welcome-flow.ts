import { prisma } from '@/lib/prisma'
import { buildRAGContext } from '@/lib/rag'
import { getOrCreateCustomer, updateLastInteraction } from '@/lib/customer'

async function main() {
    console.log('🧪 Starting Welcome Message Memory Simulation...')

    // 1. Setup Test Tenant
    const tenantSlug = 'test-memory-tenant-' + Date.now()
    const welcomeMessage = "WELCOME_TEST_MESSAGE_UNIQUE_STRING"

    console.log('Creating test tenant...')
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Test Tenant Memory',
            slug: tenantSlug,
            config: {
                welcome_message: welcomeMessage,
                verification_enabled: true
            }
        }
    })

    const phone = '+5511999999999'

    try {
        // 2. Test Case 1: New User (First Interaction)
        console.log('\n--- Test Case 1: New User ---')

        // Simulate worker logic: Get/Create Customer
        const result1 = await getOrCreateCustomer(tenant.id, phone)
        console.log(`Is New Customer: ${result1.isNew}`)
        console.log(`Is First Interaction: ${result1.isFirstInteraction}`)

        if (!result1.isFirstInteraction) {
            throw new Error('Expected first interaction to be true for new customer')
        }

        // Build RAG Context
        const context1 = await buildRAGContext('Olá', {
            tenantId: tenant.id,
            customerPhone: phone,
            isFirstInteraction: result1.isFirstInteraction
        })

        // Verify Welcome Message is present
        if (context1.systemPrompt.includes(welcomeMessage)) {
            console.log('✅ PASS: Welcome message found in system prompt for new user.')
        } else {
            console.error('❌ FAIL: Welcome message NOT found in system prompt for new user.')
            console.log('Prompt snippet:', context1.systemPrompt.substring(context1.systemPrompt.length - 500))
        }

        // Simulate sending response and updating interaction
        await updateLastInteraction(result1.customer.id)
        console.log('Updated last interaction timestamp.')

        // 3. Test Case 2: Returning User (Second Interaction)
        console.log('\n--- Test Case 2: Returning User ---')

        // Simulate worker logic again
        const result2 = await getOrCreateCustomer(tenant.id, phone)
        console.log(`Is New Customer: ${result2.isNew}`)
        console.log(`Is First Interaction: ${result2.isFirstInteraction}`)

        if (result2.isFirstInteraction) {
            throw new Error('Expected first interaction to be false for returning customer')
        }

        // Build RAG Context
        const context2 = await buildRAGContext('Tudo bem?', {
            tenantId: tenant.id,
            customerPhone: phone,
            isFirstInteraction: result2.isFirstInteraction
        })

        // Verify Welcome Message is ABSENT
        if (!context2.systemPrompt.includes(welcomeMessage)) {
            console.log('✅ PASS: Welcome message correctly EXCLUDED for returning user.')
        } else {
            console.error('❌ FAIL: Welcome message FOUND in system prompt for returning user.')
        }

        // Verify "Returning user" instruction is present
        if (context2.systemPrompt.includes('Returning user')) {
            console.log('✅ PASS: "Returning user" instruction found.')
        } else {
            console.warn('⚠️ WARN: "Returning user" instruction not found (optional but good).')
        }

    } catch (error) {
        console.error('❌ Test Failed:', error)
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...')
        const customer = await prisma.customer.findUnique({
            where: { tenantId_phone: { tenantId: tenant.id, phone } }
        })
        if (customer) {
            await prisma.customer.delete({ where: { id: customer.id } })
        }
        await prisma.tenant.delete({ where: { id: tenant.id } })
        console.log('Cleanup complete.')
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
    })
