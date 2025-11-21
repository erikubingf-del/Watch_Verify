import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/salespeople
 *
 * Fetches all salespeople for the tenant with availability info
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch salespeople
    const salespeople = await atSelect('Salespeople', {
      filterByFormula: `{tenant_id} = '${tenantId}'`
    })

    // Fetch today's appointments to calculate availability
    const today = new Date().toISOString().split('T')[0]
    const appointments = await atSelect('Appointments', {
      filterByFormula: `AND(
        {tenant_id} = '${tenantId}',
        IS_AFTER({scheduled_at}, '${today}'),
        IS_BEFORE({scheduled_at}, DATEADD('${today}', 1, 'days'))
      )`
    })

    // Calculate availability score for each salesperson
    const salespeopleMapped = salespeople.map((sp: any) => {
      const appointmentsCount = appointments.filter((apt: any) =>
        apt.fields.salesperson_id && apt.fields.salesperson_id[0] === sp.id
      ).length

      let availability_score: 'low' | 'medium' | 'high' = 'high'
      if (appointmentsCount >= 5) {
        availability_score = 'low'
      } else if (appointmentsCount >= 3) {
        availability_score = 'medium'
      }

      return {
        id: sp.id,
        name: sp.fields.name || '',
        phone: sp.fields.phone || '',
        availability_score,
        appointments_count: appointmentsCount,
        working_hours: sp.fields.working_hours || '9h-18h',
      }
    })

    return NextResponse.json({
      salespeople: salespeopleMapped,
      total: salespeopleMapped.length
    })

  } catch (error) {
    console.error('Error fetching salespeople:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salespeople' },
      { status: 500 }
    )
  }
}
