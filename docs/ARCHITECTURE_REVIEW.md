# Architecture Review: Advanced WhatsApp Agent

## Executive Summary
This document outlines the architectural principles extracted from `12-factor-agents` and `ai-that-works` that will guide the development of the "Advanced WhatsApp Agent". The goal is to move beyond simple "prompt-and-pray" loops to a rigorous, engineering-first approach.

## Core Architectural Principles

### 1. Context Engineering (Factor 3)
**Principle**: "Own your context window."
**Analysis**: Standard chat formats (User/Assistant/System) are insufficient for complex state. We must treat the context window as a structured data store.
**Implementation**:
- **Format**: Use XML-like tags (e.g., `<customer_profile>`, `<tool_result>`, `<error>`) within the user prompt to maximize information density and parsing reliability.
- **Compaction**: Implement "Decaying Resolution Memory" where older events are summarized or removed to save tokens, while critical state is preserved.
- **Error Handling**: Embed errors directly in the context window (Factor 9) to allow the LLM to self-correct.

### 2. Unified State Management (Factor 5)
**Principle**: "Unify execution state and business state."
**Analysis**: Separating the "agent loop" state from the "business logic" state leads to synchronization bugs.
**Implementation**:
- **Single Source of Truth**: The "Thread" object (persisted in Redis/Postgres) contains *everything*: message history, current tool execution status, user profile data, and pending actions.
- **Stateless Reducer**: The agent function should be a pure function: `(CurrentState, NewEvent) -> NextState` (Factor 12).

### 3. Control Flow & The "Agentic Loop" (Factor 8)
**Principle**: "Own your control flow."
**Analysis**: Infinite `while(true)` loops are dangerous. We need explicit control over when to pause, when to ask for human help, and when to terminate.
**Implementation**:
- **Interruptibility**: The system must support "pausing" execution to wait for a webhook or human approval (Factor 6).
- **Explicit Transitions**: Define clear states (e.g., `AWAITING_INPUT`, `PROCESSING`, `NEEDS_APPROVAL`) and allowed transitions.

### 4. Tools as Structured Outputs (Factor 4)
**Principle**: "Tools are just structured outputs."
**Analysis**: Tool calling should be treated as a strict schema contract.
**Implementation**:
- **Schema-First**: Define all tools using Pydantic/Zod schemas.
- **Validation**: Enforce strict validation *before* execution. If validation fails, feed the error back to the LLM (Factor 9).

### 5. Advanced RAG & Knowledge
**Principle**: "Pre-fetch all context" (Factor 13).
**Implementation**:
- **Hybrid Search**: Combine vector search (pgvector) with keyword search for product catalogs.
- **Dynamic Context**: Inject only relevant "Brand Knowledge" based on the current conversation topic.

## Proposed Architecture Diagram

```mermaid
graph TD
    User[User (WhatsApp)] -->|Message| Webhook
    Webhook -->|Event| Queue[Redis Queue]
    Queue -->|Job| Worker[Agent Worker]
    
    subgraph "Agent Core (Stateless)"
        Worker -->|Load State| DB[(Postgres/Redis)]
        Worker -->|Build Context| ContextEngine[Context Engine]
        ContextEngine -->|Retrieve| RAG[Vector Store]
        ContextEngine -->|Format| LLM[LLM (GPT-4o/Claude)]
        LLM -->|Structured Output| ToolRouter
        
        ToolRouter -->|Action| Tools[Tool Execution]
        ToolRouter -->|Pause| HumanLoop[Human Approval]
        
        Tools -->|Result| StateUpdate[Update State]
        StateUpdate -->|Persist| DB
    end
    
    StateUpdate -->|Response| WhatsAppAPI
```

## Risk Analysis
- **Complexity**: Managing a custom context format requires more code than using a framework like LangChain.
  - *Mitigation*: Build a robust `ContextBuilder` class with strict typing.
- **Token Costs**: XML-heavy context can be verbose.
  - *Mitigation*: Aggressive summarization and "decaying resolution" strategies.
- **Latency**: Multi-step reasoning loops can be slow.
  - *Mitigation*: Optimistic UI updates (where applicable) and parallel tool execution.

## Next Steps
1. Define the `Thread` and `Event` schemas (TypeScript interfaces).
2. Implement the `ContextBuilder` to generate XML-structured prompts.
3. Refactor the existing `whatsapp-worker.ts` to use this new "Stateless Reducer" pattern.
