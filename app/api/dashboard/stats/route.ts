import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics for the logged-in tenant
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [totalProducts, verifications, activeCustomers] = await Promise.all([
      // Total products
      prisma.product.count({
        where: { tenantId, isActive: true }
      }),

      // Verifications (last 30 days)
      prisma.watchVerify.findMany({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: { icd: true }
      }),

      // Active customers
      prisma.customer.count({
        where: { tenantId }
      }),
    ])

    // Calculate average ICD
    const icdScores = verifications
      .map((v) => v.icd)
      .filter((icd): icd is number => typeof icd === 'number')

    const avgICD = icdScores.length > 0
      ? Math.round((icdScores.reduce((a, b) => a + b, 0) / icdScores.length) * 10) / 10
      : 0

    return NextResponse.json({
      totalProducts,
      totalVerifications: verifications.length,
      avgICD,
      activeCustomers,
    })
  } catch (error: any) {
    logError('dashboard-stats', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
