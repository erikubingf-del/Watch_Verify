import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, buildFormula, buildAndFormula } from '@/utils/airtable'
import { logError } from '@/lib/logger'

/**
 * GET /api/dashboard/customers
 * Returns customer list for the logged-in tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
    }

    // Fetch active customers (not deleted)
    const customers = await atSelect('Customers', {
      filterByFormula: `AND({tenant_id}='${tenantId}', {deleted_at}=BLANK())`,
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }]),
    })

    // Get message counts and verification counts for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (c: any) => {
        const phone = c.fields.phone

        // Count messages
        const messages = await atSelect('Messages', {
          filterByFormula: buildAndFormula(
            ['tenant_id', '=', tenantId],
            ['phone', '=', phone]
          ),
        })

        // Count verifications
        const verifications = await atSelect('WatchVerify', {
          filterByFormula: buildAndFormula(
            ['tenant_id', '=', tenantId],
            ['phone', '=', phone]
          ),
        })

        // Get last activity
        const allMessages = messages.sort((a: any, b: any) => {
          return new Date(b.fields.created_at).getTime() - new Date(a.fields.created_at).getTime()
        })
        const lastActivity = allMessages.length > 0
          ? allMessages[0].fields.created_at
          : c.fields.created_at

        return {
          id: c.id,
          name: c.fields.name || 'Unknown',
          phone: c.fields.phone || '',
          email: c.fields.email || '',
          lastInterest: c.fields.last_interest || '',
          messages: messages.length,
          verifications: verifications.length,
          lastActivity,
          status: messages.length > 0 ? 'active' : 'inactive',
        }
      })
    )

    return NextResponse.json({ customers: customersWithStats })
  } catch (error: any) {
    logError('dashboard-customers', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
