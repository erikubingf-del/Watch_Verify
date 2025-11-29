import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Calculate date range for today
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch salespeople with today's appointment count
    const salespeople = await prisma.user.findMany({
      where: {
        tenantId,
        role: 'SALESPERSON',
        isActive: true
      },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                scheduledAt: {
                  gte: startOfDay,
                  lte: endOfDay
                },
                status: {
                  not: 'CANCELLED'
                }
              }
            }
          }
        }
      }
    })

    // Calculate availability score for each salesperson
    const salespeopleMapped = salespeople.map((sp: any) => {
      const appointmentsCount = sp._count.appointments

      let availability_score: 'low' | 'medium' | 'high' = 'high'
      if (appointmentsCount >= 5) {
        availability_score = 'low'
      } else if (appointmentsCount >= 3) {
        availability_score = 'medium'
      }

      return {
        id: sp.id,
        name: sp.name || '',
        phone: sp.phone || '',
        availability_score,
        appointments_count: appointmentsCount,
        working_hours: '9h-18h', // TODO: Add working hours to User model
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
