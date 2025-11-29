import { prisma } from '@/lib/prisma'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
    const args = process.argv.slice(2)
    const tenantId = args[0]
    const customerPhone = args[1] || '+5511999999999'

    if (!tenantId) {
        console.error('Usage: tsx scripts/test-verification-flow.ts <tenant_id> [customer_phone]')
        process.exit(1)
    }

    console.log(`Testing verification flow for tenant ${tenantId} and customer ${customerPhone}...`)

    try {
        // 1. Create a mock verification record
        console.log('Creating mock verification record...')
        const verification = await prisma.watchVerify.create({
            data: {
                tenantId,
                customerName: 'Test Customer',
                customerPhone,
                statedModel: 'Rolex Submariner',
                status: 'pending',
                photoUrl: 'https://example.com/watch.jpg',
                guaranteeUrl: 'https://example.com/card.jpg',
                invoiceUrl: 'https://example.com/invoice.jpg',
            }
        })

        console.log(`Created verification: ${verification.id}`)

        // 2. Simulate analysis update (as if worker processed it)
        console.log('Simulating analysis update...')
        const updated = await prisma.watchVerify.update({
            where: { id: verification.id },
            data: {
                brand: 'Rolex',
                model: 'Submariner Date',
                reference: '116610LN',
                serial: 'RANDOM123',
                icd: 85.5,
                legalRiskLabel: 'Documentação Completa',
                legalRiskScore: 90,
                extractedReferences: ['116610LN', '116610'],
                issues: ['Minor scratch on bezel'],
                recommendations: ['Verify serial with Rolex database'],
                status: 'approved',
                completedAt: new Date()
            }
        })

        console.log('Verification updated successfully:', updated)

        // 3. Verify retrieval
        const retrieved = await prisma.watchVerify.findUnique({
            where: { id: verification.id }
        })

        if (retrieved?.status === 'approved' && retrieved.icd === 85.5) {
            console.log('✅ Test PASSED: Verification flow simulation successful.')
        } else {
            console.error('❌ Test FAILED: Verification state mismatch.')
        }

    } catch (error) {
        console.error('Test failed:', error)
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
