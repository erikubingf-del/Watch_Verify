# Implementation Plan: Advanced WhatsApp Agent

## 1. Goal
Upgrade the existing WhatsApp agent to a "Level 3" Agentic System using the 12-Factor Agent principles. This involves moving from a simple request-response model to a stateful, event-driven architecture with rigorous context engineering.

## 2. Technical Architecture

### 2.1 Core Components
- **Agent Runner**: A new core loop that manages the `Thread` state, executes the LLM, and handles tool calls.
- **Context Engine**: A dedicated module for constructing the prompt from the thread history, applying "Decaying Resolution" to manage token usage.
- **Tool Registry**: A strongly-typed registry of all available tools (Catalog Search, CRM, Booking, etc.) using Zod schemas.
- **State Store**: Redis (primary) and Postgres (persistence) for storing the `Thread` and `Event` history.

### 2.2 Data Models (TypeScript Interfaces)
```typescript
type EventType = 'user_message' | 'model_thinking' | 'tool_call' | 'tool_result' | 'error';

interface AgentEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  data: any; // Strictly typed based on type
}

interface Thread {
  id: string;
  tenantId: string;
  customerId: string;
  events: AgentEvent[];
  status: 'active' | 'paused' | 'completed';
  metadata: Record<string, any>;
}
```

## 3. Migration Strategy

### Phase 1: Parallel Core (Non-Destructive)
1. Create the new `lib/agent/` directory structure.
2. Implement the `AgentRunner` and `ContextEngine` in isolation.
3. Port existing tools (Catalog, CRM) to the new `ToolRegistry` format.
4. Create a test script (`scripts/test-agent-runner.ts`) to verify the new core with mock events.

### Phase 2: Worker Integration
1. Modify `workers/whatsapp-worker.ts` to instantiate the `AgentRunner`.
2. Map incoming WhatsApp messages to `user_message` events.
3. Use the `AgentRunner` to generate the response.
4. Map the agent's output back to WhatsApp messages.

### Phase 3: Cleanup
1. Remove the old `lib/rag.ts` (or refactor it to be a tool).
2. Remove legacy logic from `workers/whatsapp-worker.ts`.

## 4. Folder Structure
```
lib/
  agent/
    types.ts          # Core interfaces
    runner.ts         # The main loop
    context.ts        # Prompt construction & compaction
    tools/            # Tool definitions
      catalog.ts
      crm.ts
      booking.ts
    state.ts          # Redis/DB persistence
```

## 5. Risks & Mitigation
- **Risk**: Complexity of the new "Agent Loop" might introduce bugs.
  - **Mitigation**: Extensive unit testing of the `AgentRunner` with mock LLM responses.
- **Risk**: Token usage might increase due to XML overhead.
  - **Mitigation**: Monitor token usage per turn and tune the "Decaying Resolution" parameters.
