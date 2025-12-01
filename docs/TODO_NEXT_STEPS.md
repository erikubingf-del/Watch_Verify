# Next Steps: Advanced WhatsApp Agent Implementation

## Phase 1: Foundation & Types (Day 1)
- [ ] **Define Core Interfaces**: Create `lib/types/agent.ts` to define `Thread`, `Event`, `AgentState`, and `ToolDefinition`.
- [ ] **Setup Context Engine**: Implement `lib/agent/context-engine.ts` to handle XML prompt construction and history compaction.
- [ ] **Refactor Database**: Ensure `Conversation` and `Message` models in Prisma support the new "Event" structure (or map to it).

## Phase 2: The Agent Loop (Day 2)
- [ ] **Implement the Reducer**: Create `lib/agent/reducer.ts` to process events and update state.
- [ ] **Build the Runner**: Create `lib/agent/runner.ts` to manage the `LLM -> Tool -> State` loop.
- [ ] **Tool Registry**: Centralize all tools (Catalog, CRM, Booking) into a strictly typed registry.

## Phase 3: Integration (Day 3)
- [ ] **Connect to WhatsApp**: Update `workers/whatsapp-worker.ts` to use the new `AgentRunner`.
- [ ] **Implement Human-in-the-Loop**: Add support for `PAUSED` state and "Approval Request" messages.
- [ ] **Testing**: Create a test suite for the Agent Runner using recorded conversation traces.

## Phase 4: Advanced Features (Day 4+)
- [ ] **Decaying Resolution Memory**: Implement the summarization logic for older messages.
- [ ] **Multi-Agent Handoff**: Allow the "Triage Agent" to hand off to a "Sales Agent" or "Support Agent".
