import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ToolDefinition, AgentContext } from '../types'
import { saveThread } from '../state'

export const requestSalespersonHelpTool: ToolDefinition = {
    name: 'request_salesperson_help',
    description: 'Request help from a human salesperson. Use this when the user asks for something outside your scope, negotiations, or explicit human contact.',
    schema: z.object({
        reason: z.string().describe('Why you are requesting help'),
        summary: z.string().describe('Brief summary of the conversation so far')
    }),
    execute: async (args, context: AgentContext) => {
        // 1. Find a salesperson (for now, just pick the first one or from config)
        // In a real app, we'd have a routing logic
        const salesperson = await prisma.user.findFirst({
            where: {
                tenantId: context.tenantId,
                role: 'SALESPERSON',
                isActive: true
            }
        })

        if (!salesperson || !salesperson.whatsapp) {
            return { success: false, message: 'No available salesperson found.' }
        }

        // 2. Send WhatsApp message to salesperson (Mocked for now, or use Twilio)
        // TODO: Integrate actual Twilio send here
        console.log(`[MOCK] Sending WhatsApp to ${salesperson.whatsapp}: User ${context.customerId} needs help: ${args.reason}`)

        // 3. Update Thread Status
        // We need to pause the thread so the agent doesn't auto-reply next time
        // This requires access to the thread object, which we might need to fetch or pass
        // For now, we'll assume the runner handles the status update based on this tool return

        return {
            success: true,
            message: 'Salesperson notified',
            action: 'PAUSE_THREAD',
            salespersonName: salesperson.name
        }
    }
}
