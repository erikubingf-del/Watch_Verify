import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/visits
 *
 * Fetches all appointments/visits for the tenant
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch appointments
    const appointments = await atSelect('Appointments', {
      filterByFormula: `{tenant_id} = '${tenantId}'`,
      sort: JSON.stringify([{ field: 'scheduled_at', direction: 'asc' }])
    })

    // Map to frontend format
    const visits = appointments.map((apt: any) => ({
      id: apt.id,
      customer_name: apt.fields.customer_name || '',
      customer_phone: apt.fields.customer_phone || '',
      scheduled_at: apt.fields.scheduled_at,
      product_interest: apt.fields.product_interest || '',
      assigned_salesperson: apt.fields.salesperson_name || null,
      salesperson_id: apt.fields.salesperson_id ? apt.fields.salesperson_id[0] : null,
      status: apt.fields.status || 'pending',
      created_at: apt.fields.created_at,
      notes: apt.fields.notes || '',
    }))

    return NextResponse.json({
      visits,
      total: visits.length
    })

  } catch (error) {
    console.error('Error fetching visits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }
}
