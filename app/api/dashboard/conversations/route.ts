import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect } from '@/lib/airtable'

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

    // Fetch all messages for this tenant
    const messages = await atSelect('Messages', {
      filterByFormula: `{tenant_id} = '${tenantId}'`,
      sort: [{ field: 'timestamp', direction: 'desc' }]
    })

    // Fetch appointments to check for scheduled visits
    const appointments = await atSelect('Appointments', {
      filterByFormula: `{tenant_id} = '${tenantId}'`
    })

    // Group messages by customer phone
    const conversationMap = new Map<string, any>()

    for (const msg of messages) {
      const phone = msg.fields.from_number || msg.fields.to_number
      if (!phone) continue

      if (!conversationMap.has(phone)) {
        conversationMap.set(phone, {
          id: msg.id,
          customer_phone: phone,
          customer_name: msg.fields.customer_name || '',
          messages: [],
          last_message_time: msg.fields.timestamp,
          products_shown: new Set<string>(),
        })
      }

      const conversation = conversationMap.get(phone)!
      conversation.messages.push(msg.fields)

      // Extract product mentions from message content
      // This is a simple implementation - you might want to enhance this with AI
      const content = msg.fields.content?.toLowerCase() || ''
      if (content.includes('submariner')) conversation.products_shown.add('Submariner')
      if (content.includes('daytona')) conversation.products_shown.add('Daytona')
      if (content.includes('datejust')) conversation.products_shown.add('Datejust')
      if (content.includes('gmt')) conversation.products_shown.add('GMT-Master')
      if (content.includes('nautilus')) conversation.products_shown.add('Nautilus')
      if (content.includes('aquanaut')) conversation.products_shown.add('Aquanaut')
      if (content.includes('royal oak')) conversation.products_shown.add('Royal Oak')
    }

    // Build conversation objects
    const conversations = Array.from(conversationMap.values()).map(conv => {
      // Find appointment for this customer
      const appointment = appointments.find(apt =>
        apt.fields.customer_phone === conv.customer_phone
      )

      // Determine status
      let status: 'active' | 'scheduled' | 'converted' | 'inactive' = 'inactive'
      const lastMessageDate = new Date(conv.last_message_time)
      const daysSinceLastMessage = Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))

      if (appointment) {
        status = appointment.fields.status === 'completed' ? 'converted' : 'scheduled'
      } else if (daysSinceLastMessage <= 7) {
        status = 'active'
      }

      // Generate AI summary (simplified - you might want to use OpenAI for this)
      let interest_summary = 'Cliente em conversação inicial'
      if (conv.products_shown.size > 0) {
        const products = Array.from(conv.products_shown).join(', ')
        interest_summary = `Interesse em: ${products}`
      }
      if (conv.messages.some((m: any) => m.content?.toLowerCase().includes('verificar') || m.content?.toLowerCase().includes('autenticar'))) {
        interest_summary += ' | Solicita verificação de relógio'
      }
      if (conv.messages.some((m: any) => m.content?.toLowerCase().includes('comprar') || m.content?.toLowerCase().includes('preço'))) {
        interest_summary += ' | Interessado em compra'
      }

      return {
        id: conv.id,
        customer_name: conv.customer_name || 'Cliente sem nome',
        customer_phone: conv.customer_phone,
        last_message_time: conv.last_message_time,
        interest_summary,
        products_shown: Array.from(conv.products_shown),
        visit_scheduled: !!appointment,
        visit_date: appointment?.fields.scheduled_at,
        status,
        message_count: conv.messages.length,
        last_interaction: conv.last_message_time
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
