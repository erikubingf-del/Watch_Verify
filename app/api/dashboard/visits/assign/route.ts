import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atUpdate, atGet } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dashboard/visits/assign
 *
 * Assigns a salesperson to a visit
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { visitId, salespersonId } = await req.json()

    if (!visitId || !salespersonId) {
      return NextResponse.json(
        { error: 'Missing visitId or salespersonId' },
        { status: 400 }
      )
    }

    // Get salesperson name
    const salesperson = await atGet('Salespeople', salespersonId)
    const salespersonName = salesperson?.fields?.name || 'Vendedor'

    // Update appointment with salesperson
    await atUpdate('Appointments', visitId, {
      salesperson_id: [salespersonId],
      salesperson_name: salespersonName,
    } as any)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error assigning salesperson:', error)
    return NextResponse.json(
      { error: 'Failed to assign salesperson' },
      { status: 500 }
    )
  }
}
