import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Verify salesperson exists
    const salesperson = await prisma.user.findUnique({
      where: { id: salespersonId }
    })

    if (!salesperson) {
      return NextResponse.json({ error: 'Salesperson not found' }, { status: 404 })
    }

    // Update appointment with salesperson
    await prisma.appointment.update({
      where: { id: visitId },
      data: {
        salespersonId: salespersonId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error assigning salesperson:', error)
    return NextResponse.json(
      { error: 'Failed to assign salesperson' },
      { status: 500 }
    )
  }
}
