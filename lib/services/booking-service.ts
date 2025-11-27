import {
    createBookingSession,
    updateBookingSession,
    clearBookingSession,
    parseDateFromMessage,
    parseTimeFromMessage,
    getBookingPrompt,
} from '@/lib/booking-sessions'
import { getAvailableSlots, bookAppointment } from '@/lib/scheduling'
import { logError } from '@/lib/logger'

export async function handleBookingConversation(
    session: any,
    message: string,
    tenantId: string,
    customerPhone: string
): Promise<string> {
    try {
        // Start new booking if no session exists
        if (!session) {
            session = await createBookingSession(tenantId, customerPhone, 'Cliente')
            return getBookingPrompt(session)
        }

        const lowerMsg = message.toLowerCase()

        // State: awaiting_date
        if (session.state === 'awaiting_date') {
            const date = parseDateFromMessage(message)

            if (!date) {
                return `Não entendi a data. Pode me dizer de outra forma?\n\nExemplos: "amanhã", "sexta-feira", ou "25/01"`
            }

            // Get available slots
            const slots = await getAvailableSlots(tenantId, date)

            if (slots.length === 0) {
                return `Infelizmente não temos horários disponíveis para ${formatDatePT(date)}. 😔\n\nPoderia escolher outro dia?`
            }

            // Update session with date and slots
            await updateBookingSession(customerPhone, {
                preferredDate: date,
                availableSlots: slots,
                state: 'awaiting_time',
            })

            // Format human-like slot message (NO quantities shown!)
            return formatHumanSlots(slots, date)
        }

        // State: awaiting_time
        if (session.state === 'awaiting_time') {
            const time = parseTimeFromMessage(message, session.availableSlots || [])

            if (!time) {
                return `Desculpe, não entendi o horário. Escolha um dos horários disponíveis acima, ou diga algo como "manhã" ou "tarde".`
            }

            // Update session with time
            await updateBookingSession(customerPhone, {
                preferredTime: time,
                state: 'awaiting_product',
            })

            return `Perfeito! ${time} está reservado para você. 🎯\n\nO que gostaria de ver na visita? (opcional)`
        }

        // State: awaiting_product
        if (session.state === 'awaiting_product') {
            const skipProduct = lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'pular' || lowerMsg === 'skip'
            const productInterest = skipProduct ? undefined : message

            // Book the appointment
            const booking = await bookAppointment({
                tenantId,
                customerPhone,
                customerName: session.customerName,
                date: session.preferredDate!,
                time: session.preferredTime!,
                productInterest,
            })

            // Clear session
            await clearBookingSession(customerPhone)

            if (!booking) {
                return `Ops, houve um problema ao confirmar o agendamento. Pode tentar novamente?`
            }

            // Return confirmation (salesperson name from booking)
            return formatBookingConfirmation(booking)
        }

        // Fallback
        return getBookingPrompt(session)
    } catch (error: any) {
        logError('booking-conversation', error, { customerPhone })
        return `Desculpe, tive um problema ao processar o agendamento. Vamos tentar de novo?`
    }
}

// ==========================================
// Human-Like Formatting
// ==========================================

function formatHumanSlots(slots: any[], date: string): string {
    const datePT = formatDatePT(date)
    const dayOfWeek = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' })

    let message = `Ótimo! Para ${dayOfWeek}, ${datePT}, temos:\n\n`

    slots.forEach((slot, i) => {
        // Show time only, NO quantities (more human)
        const period = getTimePeriod(slot.time)
        message += `• ${slot.time} ${period}\n`
    })

    message += `\nQual horário funciona melhor para você?`

    return message
}

function formatBookingConfirmation(booking: any): string {
    const datePT = formatDatePT(booking.date)
    const dayOfWeek = new Date(booking.date).toLocaleDateString('pt-BR', { weekday: 'long' })

    let message = `✅ *Agendamento Confirmado*\n\n`
    message += `📅 ${dayOfWeek}, ${datePT}\n`
    message += `🕒 ${booking.time}\n`
    message += `👤 ${booking.salespersonName} aguarda você\n`

    if (booking.productInterest) {
        message += `💎 ${booking.productInterest}\n`
    }

    message += `\nNos vemos em breve! 🎯`

    return message
}

function formatDatePT(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
    })
}

function getTimePeriod(time: string): string {
    const hour = parseInt(time.split(':')[0])

    if (hour < 12) return '(manhã)'
    if (hour < 18) return '(tarde)'
    return '(noite)'
}
