# Best Practices Learned: Advanced Agent Engineering

## 1. Prompt Engineering & Context
- **XML Structuring**: Use XML tags (e.g., `<context>`, `<history>`, `<goals>`) to clearly delimit sections in the prompt. This reduces "bleeding" between instructions and data.
- **System Prompt Stability**: Keep the system prompt static and focused on *identity* and *capabilities*. Inject dynamic state into the User message.
- **Chain of Thought (CoT)**: Force the model to "think" before acting by requiring a `<thinking>` block in the output before the structured tool call.

## 2. Tooling & Schemas
- **Strict Schemas**: Use Pydantic (Python) or Zod (TypeScript) to define tool inputs. Never rely on "loose" JSON.
- **Validation Feedback**: If a tool call fails validation, return the *exact* validation error to the model so it can self-correct.
- **Idempotency**: Design tools to be idempotent whenever possible. If the model retries a `create_customer` call, it shouldn't create a duplicate.

## 3. State & Persistence
- **Event Sourcing**: Treat the conversation as a stream of immutable events (`UserMessage`, `ToolCall`, `ToolResult`). State is a projection of these events.
- **Decaying Resolution**:
  - *Recent History*: Full fidelity (all tokens).
  - *Medium History*: Summarized interactions.
  - *Long-term History*: Vector embeddings (RAG).
- **Optimistic UI**: For user-facing agents, acknowledge the request immediately ("Working on it...") before starting the heavy reasoning loop.

## 4. Testing & Evals
- **Deterministic Evals**: Test tool selection logic with unit tests. "Given context X, model MUST call tool Y".
- **Regression Testing**: Keep a library of "golden threads" (past conversations) and re-run them against new prompt versions to ensure no regression in behavior.

## 5. Security
- **Human-in-the-Loop**: High-stakes actions (payments, data deletion) MUST require human approval.
- **Output Sanitization**: Scan model outputs for PII or hallucinations before sending to the user.
