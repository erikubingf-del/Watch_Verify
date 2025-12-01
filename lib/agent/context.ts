import { prisma } from '@/lib/prisma'
import { Thread, AgentEvent } from './types'

export class ContextEngine {
    async buildPrompt(thread: Thread): Promise<string> {
        const customer = await prisma.customer.findUnique({
            where: { id: thread.customerId },
            include: {
                memories: {
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Last 10 memories for now
                }
            }
        })

        if (!customer) throw new Error(`Customer ${thread.customerId} not found`)

        // 1. System Identity
        let prompt = `<system>
You are an advanced AI assistant for a luxury watch boutique.
Your goal is to assist customers with their inquiries, verify watches, and provide personalized recommendations.
You have access to the customer's profile and history.
Always use the provided tools to take actions.
</system>\n\n`

        // 2. Customer Profile (The "Context")
        prompt += `<customer_profile>\n`
        prompt += `  <name>${customer.name || 'Unknown'}</name>\n`
        prompt += `  <phone>${customer.phone}</phone>\n`
        prompt += `  <tags>${customer.tags.join(', ')}</tags>\n`
        prompt += `  <profile>${JSON.stringify(customer.profile)}</profile>\n`

        if (customer.memories.length > 0) {
            prompt += `  <memories>\n`
            customer.memories.forEach((m: any) => {
                prompt += `    <fact source="${m.source}">${m.fact}</fact>\n`
            })
            prompt += `  </memories>\n`
        }
        prompt += `</customer_profile>\n\n`

        // 3. Thread History (The "State")
        prompt += `<history>\n`
        for (const event of thread.events) {
            prompt += this.formatEvent(event)
        }
        prompt += `</history>\n\n`

        // 4. Instructions
        prompt += `<instructions>
Based on the history and customer profile, determine the next step.
If you need to search for a watch, use 'check_catalog'.
If the customer mentions a new interest, use 'update_profile' or 'log_memory'.
If the customer wants to verify a watch, use 'verify_watch'.
If you are unsure or need human help, use 'request_salesperson_help'.
Output your thought process in a <thinking> tag before calling a tool.
</instructions>`

        return prompt
    }

    private formatEvent(event: AgentEvent): string {
        const time = event.timestamp.toISOString()
        switch (event.type) {
            case 'user_message':
                return `<event type="user_message" time="${time}">${event.data.content}</event>\n`
            case 'agent_response':
                return `<event type="agent_response" time="${time}">${event.data.content}</event>\n`
            case 'tool_call':
                return `<event type="tool_call" time="${time}" tool="${event.data.toolName}">${JSON.stringify(event.data.args)}</event>\n`
            case 'tool_result':
                return `<event type="tool_result" time="${time}" tool="${event.data.toolName}">${JSON.stringify(event.data.result)}</event>\n`
            case 'error':
                return `<event type="error" time="${time}">${event.data.message}</event>\n`
            default:
                return `<event type="${event.type}" time="${time}">${JSON.stringify(event.data)}</event>\n`
        }
    }
}
