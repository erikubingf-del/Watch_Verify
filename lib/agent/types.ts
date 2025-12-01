import { z } from 'zod'

// ==========================================
// Event Sourcing Core
// ==========================================

export type EventType =
    | 'user_message'
    | 'model_thinking'
    | 'tool_call'
    | 'tool_result'
    | 'agent_response'
    | 'error'
    | 'system_log'

export interface AgentEvent {
    id: string
    type: EventType
    timestamp: Date
    data: any
    metadata?: Record<string, any>
}

// ==========================================
// State Management
// ==========================================

export type ThreadStatus = 'active' | 'paused' | 'completed'

export interface Thread {
    id: string
    tenantId: string
    customerId: string
    status: ThreadStatus
    events: AgentEvent[]
    createdAt: Date
    updatedAt: Date
    metadata: Record<string, any>
}

export interface AgentState {
    thread: Thread
    // Derived state (can be re-computed from events)
    currentStep: number
    waitingForTool: boolean
    lastError?: string | null
}

// ==========================================
// Tooling
// ==========================================

export interface ToolDefinition<T = any> {
    name: string
    description: string
    schema: z.ZodType<T>
    execute: (args: T, context: AgentContext) => Promise<any>
}

export interface AgentContext {
    tenantId: string
    customerId: string
    threadId: string
    // Access to DB/Services
    services: {
        crm: any // To be typed strictly later
        catalog: any
        booking: any
    }
}
