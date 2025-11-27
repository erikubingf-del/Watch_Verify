const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

function validateApiKey() {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
}

export async function embedText(text: string) {
  validateApiKey()

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMB_MODEL, input: text })
  })
  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`OpenAI embed error: ${res.status} - ${errorBody}`)
  }
  const data = await res.json()
  return data.data[0].embedding
}

export interface ChatOptions {
  temperature?: number
  tools?: any[]
  tool_choice?: any
}

export async function chat(
  messages: { role: 'system' | 'user' | 'assistant' | 'tool', content?: string, tool_calls?: any[], tool_call_id?: string }[],
  options: ChatOptions | number = 0.6
) {
  validateApiKey()

  const temperature = typeof options === 'number' ? options : options.temperature ?? 0.6
  const tools = typeof options === 'object' ? options.tools : undefined
  const tool_choice = typeof options === 'object' ? options.tool_choice : undefined

  const body: any = { model: CHAT_MODEL, messages, temperature }
  if (tools && tools.length > 0) {
    body.tools = tools
    if (tool_choice) body.tool_choice = tool_choice
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`OpenAI chat error: ${res.status} - ${errorBody}`)
  }
  const data = await res.json()

  // Return the full message object if it has tool calls, otherwise just content
  const message = data.choices?.[0]?.message
  if (message?.tool_calls) {
    return message // Return full message object for tool handling
  }
  return message?.content || ''
}
