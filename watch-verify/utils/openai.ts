const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

export async function embedText(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method:'POST',
    headers: { 'content-type':'application/json', Authorization:`Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMB_MODEL, input: text })
  })
  if (!res.ok) throw new Error(`OpenAI embed → ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

export async function chat(messages: {role:'system'|'user'|'assistant', content:string}[], temperature=0.6) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ 'content-type':'application/json', Authorization:`Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: CHAT_MODEL, messages, temperature })
  })
  if (!res.ok) throw new Error(`OpenAI chat → ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}
