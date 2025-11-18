import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, buildFormula } from '@/utils/airtable'
import { logError } from '@/lib/logger'

/**
 * GET /api/dashboard/verifications
 * Returns verification history for the logged-in tenant
 * Optional query params: limit (default: 10)
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

    // Get query params
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') || '10'

    // Fetch verifications
    const verifications = await atSelect('WatchVerify', {
      filterByFormula: buildFormula('tenant_id', '=', tenantId),
      maxRecords: limit,
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }]),
    })

    // Map to frontend format
    const mapped = verifications.map((v: any) => ({
      id: v.id,
      customer: v.fields.customer || 'N/A',
      phone: v.fields.phone || '',
      brand: v.fields.brand || 'N/A',
      model: v.fields.model || '',
      reference: v.fields.reference || '',
      serial: v.fields.serial || '',
      icd: v.fields.icd || 0,
      status: v.fields.status || 'pending',
      date: v.fields.created_at || new Date().toISOString(),
    }))

    return NextResponse.json({ verifications: mapped })
  } catch (error: any) {
    logError('dashboard-verifications', error)
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    )
  }
}
