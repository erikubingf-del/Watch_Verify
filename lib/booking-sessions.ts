/**
 * Booking Session Management
 *
 * Manages stateful appointment booking conversations:
 * 1. Customer requests appointment
 * 2. AI asks for preferred date
 * 3. AI shows available slots (least busy first)
 * 4. Customer selects time
 * 5. AI confirms booking
 */

import { atCreate, atSelect, atUpdate, buildFormula } from '@/utils/airtable'
import { logInfo, logError } from './logger'
import { getAvailableSlots, bookAppointment, TimeSlot } from './scheduling'

// ==========================================
// Types
// ==========================================

export interface BookingSession {
  id: string
  tenantId: string
  customerPhone: string
  customerName: string
  state: 'awaiting_date' | 'awaiting_time' | 'awaiting_product' | 'completed'
  preferredDate?: string // YYYY-MM-DD
  preferredTime?: string // HH:MM
  availableSlots?: TimeSlot[]
  productInterest?: string
  createdAt: string
  updatedAt: string
  expiresAt: string
}

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

// ==========================================
// Session CRUD
// ==========================================

/**
 * Create new booking session
 */
export async function createBookingSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<BookingSession> {
  try {
    // Clear any existing sessions for this customer
    await clearBookingSession(customerPhone)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)

    const session: BookingSession = {
      id: crypto.randomUUID(),
      tenantId,
      customerPhone,
      customerName,
      state: 'awaiting_date',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    await atCreate('BookingSessions', {
      session_id: session.id,
      tenant_id: tenantId,
      customer_phone: customerPhone,
      customer_name: customerName,
      state: session.state,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      expires_at: session.expiresAt,
    } as any)

    logInfo('booking-session', 'Created booking session', {
      sessionId: session.id,
      phone: customerPhone,
    })

    return session
  } catch (error: any) {
    logError('booking-session-create', error, { phone: customerPhone })
    throw error
  }
}

/**
 * Get existing booking session
 */
export async function getBookingSession(customerPhone: string): Promise<BookingSession | null> {
  try {
    const records = await atSelect('BookingSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
      maxRecords: '1',
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }]),
    })

    if (records.length === 0) {
      return null
    }

    const record = records[0]
    const fields = record.fields as any

    // Check if expired
    const expiresAt = new Date(fields.expires_at)
    if (expiresAt < new Date()) {
      await clearBookingSession(customerPhone)
      return null
    }

    return {
      id: fields.session_id,
      tenantId: fields.tenant_id,
      customerPhone: fields.customer_phone,
      customerName: fields.customer_name,
      state: fields.state,
      preferredDate: fields.preferred_date || undefined,
      preferredTime: fields.preferred_time || undefined,
      availableSlots: fields.available_slots ? JSON.parse(fields.available_slots) : undefined,
      productInterest: fields.product_interest || undefined,
      createdAt: fields.created_at,
      updatedAt: fields.updated_at,
      expiresAt: fields.expires_at,
    }
  } catch (error: any) {
    logError('booking-session-get', error, { phone: customerPhone })
    return null
  }
}

/**
 * Update booking session
 */
export async function updateBookingSession(
  customerPhone: string,
  updates: Partial<BookingSession>
): Promise<BookingSession | null> {
  try {
    const records = await atSelect('BookingSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
      maxRecords: '1',
    })

    if (records.length === 0) {
      return null
    }

    const recordId = records[0].id
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.state) updateData.state = updates.state
    if (updates.preferredDate) updateData.preferred_date = updates.preferredDate
    if (updates.preferredTime) updateData.preferred_time = updates.preferredTime
    if (updates.availableSlots)
      updateData.available_slots = JSON.stringify(updates.availableSlots)
    if (updates.productInterest) updateData.product_interest = updates.productInterest

    await atUpdate('BookingSessions', recordId, updateData)

    logInfo('booking-session', 'Updated booking session', {
      phone: customerPhone,
      updates: Object.keys(updates),
    })

    return await getBookingSession(customerPhone)
  } catch (error: any) {
    logError('booking-session-update', error, { phone: customerPhone })
    return null
  }
}

/**
 * Clear booking session
 */
export async function clearBookingSession(customerPhone: string): Promise<void> {
  try {
    const records = await atSelect('BookingSessions', {
      filterByFormula: buildFormula('customer_phone', '=', customerPhone),
    })

    for (const record of records) {
      await atUpdate('BookingSessions', record.id, { deleted_at: new Date().toISOString() } as any)
    }

    logInfo('booking-session', 'Cleared booking session', { phone: customerPhone })
  } catch (error: any) {
    logError('booking-session-clear', error, { phone: customerPhone })
  }
}

// ==========================================
// Conversation Helpers
// ==========================================

/**
 * Parse date from customer message
 * Handles formats like: "amanhã", "sexta", "25/01", "25 de janeiro"
 */
export function parseDateFromMessage(message: string): string | null {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const lowerMsg = message.toLowerCase().trim()

  // "hoje" / "today"
  if (lowerMsg.includes('hoje') || lowerMsg.includes('today')) {
    return today.toISOString().split('T')[0]
  }

  // "amanhã" / "tomorrow"
  if (lowerMsg.includes('amanhã') || lowerMsg.includes('amanha') || lowerMsg.includes('tomorrow')) {
    return tomorrow.toISOString().split('T')[0]
  }

  // Weekday names (próxima segunda, terça, etc.)
  const weekdays = {
    segunda: 1,
    terca: 2,
    terça: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    sábado: 6,
    domingo: 0,
  }

  for (const [day, dayNum] of Object.entries(weekdays)) {
    if (lowerMsg.includes(day)) {
      const nextDay = getNextWeekday(dayNum)
      return nextDay.toISOString().split('T')[0]
    }
  }

  // DD/MM or DD/MM/YYYY format
  const dateRegex = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
  const match = message.match(dateRegex)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1 // JS months are 0-indexed
    const year = match[3] ? parseInt(match[3]) : today.getFullYear()

    const fullYear = year < 100 ? 2000 + year : year
    const date = new Date(fullYear, month, day)

    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  return null
}

/**
 * Parse time from customer message
 * Handles formats like: "14h", "14:00", "2 da tarde", "meio dia"
 */
export function parseTimeFromMessage(message: string, availableSlots: TimeSlot[]): string | null {
  const lowerMsg = message.toLowerCase().trim()

  // Direct time match (14h, 14:00)
  const timeRegex = /(\d{1,2}):?(\d{0,2})\s*(h|hs)?/
  const match = message.match(timeRegex)
  if (match) {
    const hour = parseInt(match[1])
    const minute = match[2] ? parseInt(match[2]) : 0

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

    // Check if this time matches any available slot
    const matchingSlot = availableSlots.find((slot) => slot.time === timeStr)
    if (matchingSlot) {
      return timeStr
    }
  }

  // Named times
  if (lowerMsg.includes('manhã') || lowerMsg.includes('morning')) {
    // Find first morning slot (before 12:00)
    const morningSlot = availableSlots.find((slot) => parseInt(slot.time.split(':')[0]) < 12)
    return morningSlot?.time || null
  }

  if (lowerMsg.includes('tarde') || lowerMsg.includes('afternoon')) {
    // Find first afternoon slot (12:00 - 18:00)
    const afternoonSlot = availableSlots.find((slot) => {
      const hour = parseInt(slot.time.split(':')[0])
      return hour >= 12 && hour < 18
    })
    return afternoonSlot?.time || null
  }

  if (lowerMsg.includes('noite') || lowerMsg.includes('evening')) {
    // Find first evening slot (after 18:00)
    const eveningSlot = availableSlots.find((slot) => parseInt(slot.time.split(':')[0]) >= 18)
    return eveningSlot?.time || null
  }

  // Numbered choice (1, 2, 3...)
  const choiceMatch = lowerMsg.match(/^(\d+)$/)
  if (choiceMatch) {
    const choice = parseInt(choiceMatch[1]) - 1 // 0-indexed
    if (choice >= 0 && choice < availableSlots.length) {
      return availableSlots[choice].time
    }
  }

  return null
}

/**
 * Format available slots for display
 */
export function formatAvailableSlotsMessage(slots: TimeSlot[], date: string): string {
  if (slots.length === 0) {
    return `Desculpe, não temos horários disponíveis para esta data. 😔\n\nGostaria de escolher outra data?`
  }

  const dateFormatted = new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let message = `📅 *Horários disponíveis* (${dateFormatted}):\n\n`

  slots.forEach((slot, i) => {
    const icon = slot.booked === 0 ? '✅' : slot.percentage < 50 ? '🟢' : '🟡'
    message += `${i + 1}. ${icon} *${slot.time}* (${slot.available - slot.booked} vagas)\n`
  })

  message += `\nEscolha um horário pelo número ou digite o horário desejado.`

  return message
}

/**
 * Get next occurrence of a weekday
 */
function getNextWeekday(targetDay: number): Date {
  const today = new Date()
  const currentDay = today.getDay()

  let daysUntilTarget = targetDay - currentDay
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7 // Next week
  }

  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntilTarget)

  return nextDate
}

// ==========================================
// Conversation Flow
// ==========================================

/**
 * Get next prompt for booking conversation
 */
export function getBookingPrompt(session: BookingSession): string {
  switch (session.state) {
    case 'awaiting_date':
      return `📅 *Agendar Visita*\n\nQual dia você prefere?\n\nPode ser:\n• Hoje ou amanhã\n• Dia da semana (ex: sexta-feira)\n• Data específica (ex: 25/01)`

    case 'awaiting_time':
      if (session.availableSlots && session.availableSlots.length > 0) {
        return formatAvailableSlotsMessage(
          session.availableSlots,
          session.preferredDate || new Date().toISOString().split('T')[0]
        )
      }
      return `Aguardando confirmação...`

    case 'awaiting_product':
      return `Perfeito! 🎯\n\nPara finalizar, qual produto você tem interesse em ver?\n\n(Opcional - pode pular digitando "não")`

    case 'completed':
      return `✅ Agendamento confirmado! Aguardamos você.`

    default:
      return `Olá! Como posso ajudar?`
  }
}
