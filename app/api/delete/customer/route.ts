import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validate, deleteCustomerSchema } from '@/lib/validations'
import { logInfo, logError } from '@/lib/logger'

/**
 * LGPD-compliant customer deletion endpoint
 * NOTE: Currently performs HARD DELETE as schema does not support soft-deletes yet.
 * This effectively removes the customer and all related data.
 */
export async function POST(req: NextRequest) {
  let phone: string | undefined

  try {
    // Step 1: Validate input
    const body = await req.json()
    const validation = validate(deleteCustomerSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: `Validation failed: ${validation.error}` },
        { status: 400 }
      )
    }

    phone = validation.data.phone

    // Step 2: Find customer
    // We search across all tenants for this phone number to ensure full cleanup
    // or we could require tenantId. For now, we'll delete all instances of this phone.
    const customers = await prisma.customer.findMany({
      where: { phone: phone }
    })

    if (!customers.length) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'Customer not found' })
    }

    const deletedCount = {
      customers: 0,
      messages: 0,
      verifications: 0,
    }

    // Step 3: Delete data for each customer instance
    for (const customer of customers) {
      // 3a. Delete WatchVerifications
      const verifications = await prisma.watchVerify.deleteMany({
        where: { customerPhone: phone } // WatchVerify stores phone directly
      })
      deletedCount.verifications += verifications.count

      // 3b. Delete Messages (via Conversations)
      // First find conversations
      const conversations = await prisma.conversation.findMany({
        where: { customerId: customer.id }
      })

      for (const conv of conversations) {
        const msgs = await prisma.message.deleteMany({
          where: { conversationId: conv.id }
        })
        deletedCount.messages += msgs.count
      }

      // Delete conversations themselves
      await prisma.conversation.deleteMany({
        where: { customerId: customer.id }
      })

      // 3c. Delete Customer Memories
      await prisma.customerMemory.deleteMany({
        where: { customerId: customer.id }
      })

      // 3d. Delete Appointments
      await prisma.appointment.deleteMany({
        where: { customerId: customer.id }
      })

      // 3e. Delete Customer
      await prisma.customer.delete({
        where: { id: customer.id }
      })
      deletedCount.customers++
    }

    // Step 4: Log the deletion for audit trail
    logInfo('customer-deletion', `LGPD deletion completed for ${phone}`, deletedCount)

    return NextResponse.json({
      ok: true,
      deleted: deletedCount.customers,
      cascade: {
        messages: deletedCount.messages,
        verifications: deletedCount.verifications,
      },
      message: 'Customer and all related data deleted successfully (Hard Delete)',
    })
  } catch (e: any) {
    logError('customer-deletion', e, { phone })
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
