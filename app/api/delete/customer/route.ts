import { NextRequest, NextResponse } from 'next/server'
import { atSelect, atUpdate, buildFormula } from '@/utils/airtable'
import { validate, deleteCustomerSchema } from '@/lib/validations'
import { logInfo, logError } from '@/lib/logger'

/**
 * LGPD-compliant customer deletion endpoint
 * Soft-deletes customer and all related data (cascade)
 */
export async function POST(req: NextRequest) {
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

    const { phone } = validation.data

    // Step 2: Find customer using safe formula
    const formula = buildFormula('phone', '=', phone)
    const customers = await atSelect('Customers', { filterByFormula: formula })

    if (!customers.length) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'Customer not found' })
    }

    const timestamp = new Date().toISOString()
    const deletedCount = {
      customers: 0,
      messages: 0,
      verifications: 0,
    }

    // Step 3: Soft-delete customer records
    await Promise.all(
      customers.map(async (customer) => {
        await atUpdate('Customers', customer.id, { deleted_at: timestamp } as any)
        deletedCount.customers++
      })
    )

    // Step 4: Cascade delete - soft-delete related Messages
    const messages = await atSelect('Messages', { filterByFormula: formula })
    await Promise.all(
      messages.map(async (message) => {
        await atUpdate('Messages', message.id, { deleted_at: timestamp } as any)
        deletedCount.messages++
      })
    )

    // Step 5: Cascade delete - soft-delete related WatchVerify records
    const verifications = await atSelect('WatchVerify', { filterByFormula: formula })
    await Promise.all(
      verifications.map(async (verification) => {
        await atUpdate('WatchVerify', verification.id, { deleted_at: timestamp } as any)
        deletedCount.verifications++
      })
    )

    // Step 6: Log the deletion for audit trail
    logInfo('customer-deletion', `LGPD deletion completed for ${phone}`, deletedCount)

    return NextResponse.json({
      ok: true,
      deleted: deletedCount.customers,
      cascade: {
        messages: deletedCount.messages,
        verifications: deletedCount.verifications,
      },
      message: 'Customer and all related data soft-deleted successfully',
    })
  } catch (e: any) {
    logError('customer-deletion', e, { phone: body?.phone })
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
