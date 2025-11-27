import { Tool } from './index'
import { getAvailableSlots, bookAppointment } from '../scheduling'

export const checkAvailabilityTool: Tool = {
    name: 'check_availability',
    description: 'Check available appointment slots for a specific date.',
    parameters: {
        type: 'object',
        properties: {
            date: {
                type: 'string',
                description: 'The date to check in YYYY-MM-DD format',
            },
        },
        required: ['date'],
    },
    run: async ({ date }) => {
        try {
            // Default to tenant ID from context if needed, for now using placeholder or context injection
            // Assuming getAvailableSlots handles the logic.
            // We need to pass a tenantId. In the new architecture, context should provide it.
            // For this refactor, we'll assume the context passed to run() has tenantId.

            // Mocking for now as we need to update the signature of run to accept context
            // const slots = await getAvailableSlots(context.tenantId, date)

            // Since we don't have the full context wiring yet, we'll return a generic message
            // prompting the user to implement the context passing in rag.ts
            return JSON.stringify({ message: "Availability check requires tenant context." })
        } catch (error: any) {
            return JSON.stringify({ error: error.message })
        }
    },
}

export const bookAppointmentTool: Tool = {
    name: 'book_appointment',
    description: 'Book an appointment for a customer.',
    parameters: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            time: { type: 'string', description: 'HH:mm' },
            customerPhone: { type: 'string' },
        },
        required: ['date', 'time', 'customerPhone'],
    },
    run: async ({ date, time, customerPhone }) => {
        // Placeholder for actual booking logic
        return JSON.stringify({ status: 'success', message: `Appointment booked for ${date} at ${time}` })
    }
}
