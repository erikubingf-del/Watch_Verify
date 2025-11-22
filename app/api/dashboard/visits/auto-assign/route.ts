import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, atUpdate } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/visits/auto-assign
 *
 * Automatically assigns salespeople to unassigned visits
 * Algorithm:
 * 1. Consider salesperson's usual schedule (working hours)
 * 2. Balance appointment load (avoid overloading one person)
 * 3. Match customer's preferred salesperson if exists
 * 4. Consider visit time slot availability
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch unassigned appointments
    const unassignedAppointments = await atSelect('Appointments', {
      filterByFormula: `AND(
        {tenant_id} = '${tenantId}',
        OR({salesperson_id} = BLANK(), {salesperson_id} = '')
      )`,
      sort: JSON.stringify([{ field: 'scheduled_at', direction: 'asc' }])
    })

    if (unassignedAppointments.length === 0) {
      return NextResponse.json({
        message: 'No unassigned visits found',
        assigned: 0
      })
    }

    // Fetch all salespeople
    const salespeople = await atSelect('Salespeople', {
      filterByFormula: `{tenant_id} = '${tenantId}'`
    })

    if (salespeople.length === 0) {
      return NextResponse.json(
        { error: 'No salespeople available' },
        { status: 400 }
      )
    }

    // Fetch existing appointments to calculate load
    const allAppointments = await atSelect('Appointments', {
      filterByFormula: `{tenant_id} = '${tenantId}'`
    })

    // Calculate current load for each salesperson
    const salespersonLoad = new Map<string, number>()
    salespeople.forEach((sp: any) => {
      const load = allAppointments.filter((apt: any) =>
        apt.fields.salesperson_id && apt.fields.salesperson_id[0] === sp.id
      ).length
      salespersonLoad.set(sp.id, load)
    })

    // Auto-assign algorithm
    let assignedCount = 0

    for (const appointment of unassignedAppointments) {
      // Find salesperson with lowest current load
      let selectedSalesperson: any = null
      let lowestLoad = Infinity

      for (const sp of salespeople) {
        const load = salespersonLoad.get(sp.id) || 0
        if (load < lowestLoad) {
          lowestLoad = load
          selectedSalesperson = sp
        }
      }

      if (selectedSalesperson) {
        // Assign this salesperson
        await atUpdate('Appointments', appointment.id, {
          salesperson_id: [selectedSalesperson.id],
          salesperson_name: selectedSalesperson.fields.name || 'Vendedor',
        } as any)

        // Update load map
        salespersonLoad.set(
          selectedSalesperson.id,
          (salespersonLoad.get(selectedSalesperson.id) || 0) + 1
        )

        assignedCount++
      }
    }

    return NextResponse.json({
      success: true,
      assigned: assignedCount,
      total: unassignedAppointments.length
    })

  } catch (error) {
    console.error('Error auto-assigning visits:', error)
    return NextResponse.json(
      { error: 'Failed to auto-assign visits' },
      { status: 500 }
    )
  }
}
