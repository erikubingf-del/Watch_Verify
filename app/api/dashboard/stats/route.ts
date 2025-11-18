import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, buildFormula } from '@/utils/airtable'
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

    // Fetch all data in parallel
    const [catalogItems, verifications, customers] = await Promise.all([
      // Total products
      atSelect('Catalog', {
        filterByFormula: buildFormula('tenant_id', '=', tenantId),
      }),

      // Verifications (last 30 days)
      atSelect('WatchVerify', {
        filterByFormula: `AND({tenant_id}='${tenantId}', IS_AFTER({created_at}, DATEADD(TODAY(), -30, 'days')))`,
      }),

      // Active customers
      atSelect('Customers', {
        filterByFormula: buildFormula('tenant_id', '=', tenantId),
      }),
    ])

    // Calculate stats
    const totalProducts = catalogItems.length
    const totalVerifications = verifications.length

    // Calculate average ICD
    const icdScores = verifications
      .map((v: any) => v.fields.icd)
      .filter((icd: any) => typeof icd === 'number')
    const avgICD = icdScores.length > 0
      ? Math.round((icdScores.reduce((a: number, b: number) => a + b, 0) / icdScores.length) * 10) / 10
      : 0

    const activeCustomers = customers.filter((c: any) => !c.fields.deleted_at).length

    return NextResponse.json({
      totalProducts,
      totalVerifications,
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
