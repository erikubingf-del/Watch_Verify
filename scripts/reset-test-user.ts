import { prisma } from '@/lib/prisma'

async function main() {
    const args = process.argv.slice(2)
    const phone = args[0]
    const tenantSlug = args[1] || 'dryzun' // Default to dryzun if not specified

    if (!phone) {
        console.error('❌ Please provide a phone number.')
        console.log('Usage: npx tsx scripts/reset-test-user.ts <phone> [tenantSlug]')
        process.exit(1)
    }

    console.log(`\n🗑️  Resetting user data for ${phone} in tenant '${tenantSlug}'...`)

    try {
        // 1. Find Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug }
        })

        if (!tenant) {
            console.error(`❌ Tenant '${tenantSlug}' not found.`)
            process.exit(1)
        }

        // 2. Find Customer
        const customer = await prisma.customer.findUnique({
            where: {
                tenantId_phone: {
                    tenantId: tenant.id,
                    phone: phone
                }
            }
        })

        if (!customer) {
            console.log(`⚠️  Customer not found. Nothing to delete.`)
            console.log(`✅ User is clean and ready for first interaction.`)
            return
        }

        console.log(`Found customer: ${customer.name || 'Unknown'} (${customer.id})`)

        // 3. Delete Related Data (Manual Cascade)

        // A. Messages & Conversations
        const conversations = await prisma.conversation.findMany({
            where: { customerId: customer.id }
        })

        for (const conv of conversations) {
            const deletedMessages = await prisma.message.deleteMany({
                where: { conversationId: conv.id }
            })
            console.log(`   - Deleted ${deletedMessages.count} messages from conversation ${conv.id}`)
        }

        const deletedConversations = await prisma.conversation.deleteMany({
            where: { customerId: customer.id }
        })
        console.log(`   - Deleted ${deletedConversations.count} conversations`)

        // B. Appointments
        const deletedAppointments = await prisma.appointment.deleteMany({
            where: { customerId: customer.id }
        })
        console.log(`   - Deleted ${deletedAppointments.count} appointments`)

        // C. Memories
        const deletedMemories = await prisma.customerMemory.deleteMany({
            where: { customerId: customer.id }
        })
        console.log(`   - Deleted ${deletedMemories.count} memories`)

        // D. Orders
        const deletedOrders = await prisma.order.deleteMany({
            where: { customerId: customer.id }
        })
        console.log(`   - Deleted ${deletedOrders.count} orders`)

        // 4. Delete Customer
        await prisma.customer.delete({
            where: { id: customer.id }
        })
        console.log(`✅ Customer record deleted.`)

        console.log(`\n✨ User ${phone} has been completely reset!`)
        console.log(`Next message from this number will be treated as a FIRST INTERACTION.`)

    } catch (error: any) {
        console.error('❌ Error resetting user:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
