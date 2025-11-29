import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/conversations
 *
 * Fetches conversation summaries grouped by customer
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch conversations with details
    const conversationsData = await prisma.conversation.findMany({
      where: { tenantId },
      include: {
        customer: {
          include: {
            appointments: {
              orderBy: { scheduledAt: 'desc' },
              take: 1
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Take last 5 for summary context
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const conversations = conversationsData.map(conv => {
      const lastMessage = conv.messages[0]
      const appointment = conv.customer.appointments[0]

      // Determine status
      let status: 'active' | 'scheduled' | 'converted' | 'inactive' = 'inactive'
      const lastMessageDate = lastMessage ? new Date(lastMessage.createdAt) : new Date(conv.updatedAt)
      const daysSinceLastMessage = Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))

      if (appointment) {
        status = appointment.status === 'COMPLETED' ? 'converted' : 'scheduled'
      } else if (daysSinceLastMessage <= 7) {
        status = 'active'
      }

      // Generate summary from messages
      let interest_summary = conv.summary || 'Cliente em conversação inicial'

      // If no AI summary, do a basic keyword check on recent messages
      if (!conv.summary && conv.messages.length > 0) {
        const recentContent = conv.messages.map(m => m.content.toLowerCase()).join(' ')
        const products = []
        if (recentContent.includes('submariner')) products.push('Submariner')
        if (recentContent.includes('daytona')) products.push('Daytona')
        if (recentContent.includes('datejust')) products.push('Datejust')

        if (products.length > 0) {
          interest_summary = `Interesse em: ${products.join(', ')}`
        }
      }

      return {
        id: conv.id,
        customer_name: conv.customer.name || 'Cliente sem nome',
        customer_phone: conv.customer.phone,
        last_message_time: lastMessage ? lastMessage.createdAt.toISOString() : conv.updatedAt.toISOString(),
        interest_summary,
        products_shown: [], // TODO: Extract from message metadata if available
        visit_scheduled: !!appointment && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED',
        visit_date: appointment ? appointment.scheduledAt.toISOString() : undefined,
        status,
        message_count: conv.messages.length, // This is just the fetched count (5), ideally we'd have a total count
        last_interaction: lastMessage ? lastMessage.createdAt.toISOString() : conv.updatedAt.toISOString()
      }
    })

    return NextResponse.json({
      conversations,
      total: conversations.length
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
