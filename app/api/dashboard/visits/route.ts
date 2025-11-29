import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const appointments = await prisma.appointment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        salesperson: true
      },
      orderBy: { scheduledAt: 'asc' }
    })

    // Map to frontend format
    const visits = appointments.map((apt) => ({
      id: apt.id,
      customer_name: apt.customer.name || '',
      customer_phone: apt.customer.phone || '',
      scheduled_at: apt.scheduledAt.toISOString(),
      product_interest: (apt.metadata as any)?.product_interest || '',
      assigned_salesperson: apt.salesperson.name || null,
      salesperson_id: apt.salespersonId,
      status: apt.status.toLowerCase(),
      created_at: apt.createdAt.toISOString(),
      notes: apt.notes || '',
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
