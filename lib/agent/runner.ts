import { v4 as uuidv4 } from 'uuid'
import { ContextEngine } from './context'
import { createThread, loadThread, saveThread, appendEvent, getActiveThreadForCustomer, setActiveThreadForCustomer } from './state'
import { Thread, AgentEvent } from './types'
import { updateProfileTool, logMemoryTool } from './tools/crm'
import { checkCatalogTool } from './tools/catalog'
import { requestSalespersonHelpTool } from './tools/human'

const contextEngine = new ContextEngine()

// Registry
const tools = [
    updateProfileTool,
    logMemoryTool,
    checkCatalogTool,
    requestSalespersonHelpTool
]

// Map to OpenAI Tools format
const openAITools = tools.map(t => ({
    type: 'function',
    function: {
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.schema)
    }
}))

export class AgentRunner {
    async run(tenantId: string, customerId: string, userMessage: string): Promise<string> {
        // 1. Load or Create Thread
        // For now, we assume one active thread per customer. 
        // In reality, we might look up an active thread ID from Redis.
        // Let's assume we pass threadId or find it.
        // For this implementation, I'll assume we find the latest active thread or create one.
        // But to keep it simple and stateless as per request, I'll just load the "active" thread.

        // TODO: Implement getActiveThread in state.ts properly. 
        // For now, let's assume we create a new thread if none exists or load the last one.
        // I'll implement a helper in state.ts later.
        // For now, I'll just create a new thread if I can't find one (mock logic).

        // Actually, let's use the helper I defined in state.ts: getActiveThreadForCustomer
        let thread = await getActiveThreadForCustomer(customerId)

        if (!thread) {
            thread = await createThread(tenantId, customerId)
            // Link customer to thread if needed
            await setActiveThreadForCustomer(customerId, thread.id)
        }

        // 2. Append User Message
        await appendEvent(thread.id, {
            id: uuidv4(),
            type: 'user_message',
            timestamp: new Date(),
            data: { content: userMessage }
        })

        // 3. The Loop (Max 5 turns to prevent infinite loops)
        let turns = 0
        const MAX_TURNS = 5

        while (turns < MAX_TURNS) {
            turns++

            // 3.1 Build Context (The "Brain")
            // We reload the thread to get the latest events
            thread = await loadThread(thread.id)
            if (!thread) throw new Error('Thread lost')

            const prompt = await contextEngine.buildPrompt(thread)

            // 3.2 Call LLM
            const response = await this.callOpenAI(prompt, openAITools)

            // 3.3 Handle Response
            const message = response.choices[0].message

            if (message.tool_calls) {
                // Handle Tool Calls
                for (const toolCall of message.tool_calls) {
                    const fnName = toolCall.function.name
                    const args = JSON.parse(toolCall.function.arguments)

                    // Log Tool Call
                    await appendEvent(thread.id, {
                        id: uuidv4(),
                        type: 'tool_call',
                        timestamp: new Date(),
                        data: { toolName: fnName, args }
                    })

                    // Execute Tool
                    const toolDef = tools.find(t => t.name === fnName)
                    let result
                    if (toolDef) {
                        try {
                            result = await toolDef.execute(args, {
                                tenantId,
                                customerId,
                                threadId: thread.id,
                                services: { crm: null, catalog: null, booking: null } // Injected services
                            })
                        } catch (error: any) {
                            result = { error: error.message }
                        }
                    } else {
                        result = { error: `Tool ${fnName} not found` }
                    }

                    // Log Result
                    await appendEvent(thread.id, {
                        id: uuidv4(),
                        type: 'tool_result',
                        timestamp: new Date(),
                        data: { toolName: fnName, result }
                    })

                    // Special handling for PAUSE_THREAD
                    if (result.action === 'PAUSE_THREAD') {
                        // Update thread status
                        thread.status = 'paused'
                        await saveThread(thread)
                        return "I have notified a salesperson. They will be with you shortly."
                    }
                }
                // Loop continues to let LLM see the result
            } else {
                // Final Response
                const content = message.content
                await appendEvent(thread.id, {
                    id: uuidv4(),
                    type: 'agent_response',
                    timestamp: new Date(),
                    data: { content }
                })
                return content
            }
        }

        return "I'm sorry, I'm having trouble processing your request right now."
    }

    private async callOpenAI(systemPrompt: string, tools: any[]) {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) throw new Error('OPENAI_API_KEY not set')

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Or gpt-4-turbo
                messages: [
                    { role: 'system', content: systemPrompt }
                    // We don't pass history here because it's already in systemPrompt!
                    // But wait, if we use tool_calls, OpenAI expects the tool_call message in history
                    // to match the tool_result.
                    // If we squash everything into systemPrompt, OpenAI won't know we are "replying" to a tool call.
                    //
                    // CRITICAL FIX:
                    // If we use the "Stateless" approach with squashed XML, we are essentially "Prompting" the model
                    // to output a tool call. We are NOT using the interactive chat history of OpenAI.
                    // However, OpenAI's `tools` feature works best when it sees the conversation structure.
                    //
                    // HYBRID FIX:
                    // We send:
                    // 1. System: XML Context (Profile, History of PREVIOUS turns)
                    // 2. User: "Current State: <history>...</history>. What is the next step?"
                    //
                    // Actually, if we want to use `tools` properly, we should probably map our `AgentEvent`s 
                    // to OpenAI messages for the *current session* or *current turn*.
                    // But `context.ts` already formats the history into XML.
                    //
                    // Let's stick to the "Stateless" plan:
                    // We send ONE message (System) containing the entire state.
                    // We ask the model to generate a response.
                    // If the model generates a tool call, it's because it decided to based on the XML.
                    // OpenAI *will* return a tool_call in the message.
                    //
                    // The issue is: When we feed the result back, we are sending a NEW request.
                    // The model doesn't know it's "continuing" unless we provide the previous `tool_calls` message.
                    //
                    // SOLUTION:
                    // Since we are rebuilding the prompt from scratch every time, the "History" XML 
                    // *includes* the tool call and result from the previous iteration!
                    // So the model sees:
                    // <history>
                    //   <event type="tool_call">...</event>
                    //   <event type="tool_result">...</event>
                    // </history>
                    //
                    // So it knows what happened. It doesn't need the OpenAI `messages` array to know state.
                    // It just needs to look at the XML.
                    //
                    // So, we just send ONE message every time.
                ],
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: 'auto'
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`OpenAI Error: ${err}`)
        }

        return response.json()
    }
}

// Helper to convert Zod to JSON Schema (Simplified)
function zodToJsonSchema(schema: any): any {
    // This is a very naive implementation. 
    // In production, use `zod-to-json-schema` package.
    // For now, I'll manually map the known schemas or use a basic heuristic.
    // Since I know my tools, I'll hardcode the mapping for safety if needed, 
    // or trust a basic recursive mapper.

    // Let's just implement a basic mapper for the specific tools we have.
    // It's safer than a buggy generic one.

    if (schema._def.typeName === 'ZodObject') {
        const properties: any = {}
        const required: string[] = []

        for (const [key, value] of Object.entries(schema.shape)) {
            const shape: any = value
            properties[key] = { type: 'string' } // Default

            if (shape._def.typeName === 'ZodString') properties[key].type = 'string'
            if (shape._def.typeName === 'ZodNumber') properties[key].type = 'number'
            if (shape._def.typeName === 'ZodArray') {
                properties[key].type = 'array'
                properties[key].items = { type: 'string' } // Assume string array
            }
            if (shape._def.typeName === 'ZodOptional') {
                // Unwrap
                const inner = shape._def.innerType
                if (inner._def.typeName === 'ZodString') properties[key].type = 'string'
                if (inner._def.typeName === 'ZodNumber') properties[key].type = 'number'
                if (inner._def.typeName === 'ZodArray') {
                    properties[key].type = 'array'
                    properties[key].items = { type: 'string' }
                }
            } else {
                required.push(key)
            }

            if (shape.description) properties[key].description = shape.description
        }

        return {
            type: 'object',
            properties,
            required
        }
    }
    return {}
}
