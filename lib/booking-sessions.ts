/**
 * Booking Session Management (Redis)
 *
 * Manages stateful appointment booking conversations.
 */

import { SessionManager, BaseSession } from './session-manager'
import { logInfo, logError } from './logger'
import { TimeSlot } from './scheduling'

// Re-export types
export { TimeSlot }

export interface BookingSession extends BaseSession {
  state: 'awaiting_date' | 'awaiting_time' | 'awaiting_product' | 'completed'
  preferredDate?: string // YYYY-MM-DD
  preferredTime?: string // HH:MM
  availableSlots?: TimeSlot[]
  productInterest?: string
  expiresAt?: string // Optional in Redis (handled by TTL), but kept for compatibility
}

const sessionManager = new SessionManager<BookingSession>('booking')

/**
 * Create new booking session
 */
export async function createBookingSession(
  tenantId: string,
  customerPhone: string,
  customerName: string
): Promise<BookingSession> {
  const now = new Date().toISOString()

  const session: BookingSession = {
    id: crypto.randomUUID(),
    tenantId,
    customerPhone,
    customerName,
    state: 'awaiting_date',
    createdAt: now,
    updatedAt: now,
  }

  await sessionManager.create(customerPhone, session)
  logInfo('booking-session', 'Created booking session (Redis)', { sessionId: session.id, phone: customerPhone })

  return session
}

/**
 * Get existing booking session
 */
export async function getBookingSession(customerPhone: string): Promise<BookingSession | null> {
  return await sessionManager.get(customerPhone)
}

/**
 * Update booking session
 */
export async function updateBookingSession(
  customerPhone: string,
  updates: Partial<BookingSession>
): Promise<BookingSession | null> {
  const updated = await sessionManager.update(customerPhone, updates)
  if (updated) {
    logInfo('booking-session', 'Updated booking session (Redis)', { phone: customerPhone, updates: Object.keys(updates) })
  }
  return updated
}

/**
 * Clear booking session
 */
export async function clearBookingSession(customerPhone: string): Promise<void> {
  await sessionManager.clear(customerPhone)
  logInfo('booking-session', 'Cleared booking session (Redis)', { phone: customerPhone })
}

// ==========================================
// Conversation Helpers (Unchanged)
// ==========================================

export function parseDateFromMessage(message: string): string | null {
  // ... (Keep existing logic, omitted for brevity, but in real refactor I should keep it)
  // Since I am overwriting the file, I MUST include the helper functions.
  // I will copy them from the original file content I read earlier.

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const lowerMsg = message.toLowerCase().trim()

  if (lowerMsg.includes('hoje') || lowerMsg.includes('today')) {
    return today.toISOString().split('T')[0]
  }

  if (lowerMsg.includes('amanhã') || lowerMsg.includes('amanha') || lowerMsg.includes('tomorrow')) {
    return tomorrow.toISOString().split('T')[0]
  }

  const weekdays = {
    segunda: 1, terca: 2, terça: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, sábado: 6, domingo: 0,
  }

  for (const [day, dayNum] of Object.entries(weekdays)) {
    if (lowerMsg.includes(day)) {
      const nextDay = getNextWeekday(dayNum)
      return nextDay.toISOString().split('T')[0]
    }
  }

  const dateRegex = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
  const match = message.match(dateRegex)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2]) - 1
    const year = match[3] ? parseInt(match[3]) : today.getFullYear()
    const fullYear = year < 100 ? 2000 + year : year
    const date = new Date(fullYear, month, day)
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]
  }

  return null
}

export function parseTimeFromMessage(message: string, availableSlots: TimeSlot[]): string | null {
  const lowerMsg = message.toLowerCase().trim()
  const timeRegex = /(\d{1,2}):?(\d{0,2})\s*(h|hs)?/
  const match = message.match(timeRegex)
  if (match) {
    const hour = parseInt(match[1])
    const minute = match[2] ? parseInt(match[2]) : 0
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    const matchingSlot = availableSlots.find((slot) => slot.time === timeStr)
    if (matchingSlot) return timeStr
  }

  if (lowerMsg.includes('manhã') || lowerMsg.includes('morning')) {
    const morningSlot = availableSlots.find((slot) => parseInt(slot.time.split(':')[0]) < 12)
    return morningSlot?.time || null
  }

  if (lowerMsg.includes('tarde') || lowerMsg.includes('afternoon')) {
    const afternoonSlot = availableSlots.find((slot) => {
      const hour = parseInt(slot.time.split(':')[0])
      return hour >= 12 && hour < 18
    })
    return afternoonSlot?.time || null
  }

  if (lowerMsg.includes('noite') || lowerMsg.includes('evening')) {
    const eveningSlot = availableSlots.find((slot) => parseInt(slot.time.split(':')[0]) >= 18)
    return eveningSlot?.time || null
  }

  const choiceMatch = lowerMsg.match(/^(\d+)$/)
  if (choiceMatch) {
    const choice = parseInt(choiceMatch[1]) - 1
    if (choice >= 0 && choice < availableSlots.length) return availableSlots[choice].time
  }

  return null
}

export function formatAvailableSlotsMessage(slots: TimeSlot[], date: string): string {
  if (slots.length === 0) return `Desculpe, não temos horários disponíveis para esta data. 😔\n\nGostaria de escolher outra data?`

  const dateFormatted = new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  let message = `📅 *Horários disponíveis* (${dateFormatted}):\n\n`
  slots.forEach((slot, i) => {
    const icon = slot.booked === 0 ? '✅' : slot.percentage < 50 ? '🟢' : '🟡'
    message += `${i + 1}. ${icon} *${slot.time}* (${slot.available - slot.booked} vagas)\n`
  })
  message += `\nEscolha um horário pelo número ou digite o horário desejado.`
  return message
}

function getNextWeekday(targetDay: number): Date {
  const today = new Date()
  const currentDay = today.getDay()
  let daysUntilTarget = targetDay - currentDay
  if (daysUntilTarget <= 0) daysUntilTarget += 7
  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntilTarget)
  return nextDate
}

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
