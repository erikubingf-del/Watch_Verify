import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

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

    // Fetch active customers
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        conversations: {
          include: {
            _count: {
              select: { messages: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    })

    // Get verification counts and format
    const customersWithStats = await Promise.all(
      customers.map(async (c: any) => {
        // Count verifications
        const verificationsCount = await prisma.watchVerify.count({
          where: {
            tenantId,
            customerPhone: c.phone
          }
        })

        // Calculate total messages
        const messageCount = c.conversations.reduce((acc: number, conv: any) => acc + conv._count.messages, 0)

        // Get last activity
        const lastActivity = c.lastInteraction || c.createdAt

        // Get profile info
        const profile = c.profile as any || {}

        return {
          id: c.id,
          name: c.name || 'Unknown',
          phone: c.phone || '',
          email: c.email || '',
          lastInterest: profile.interests?.[0] || '',
          messages: messageCount,
          verifications: verificationsCount,
          lastActivity: lastActivity.toISOString(),
          status: messageCount > 0 ? 'active' : 'inactive',
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
