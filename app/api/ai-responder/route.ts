import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/utils/openai'
import { validate, aiResponderSchema } from '@/lib/validations'
import { rateLimitMiddleware, getIdentifier, addRateLimitHeaders } from '@/lib/ratelimit'
import { logError } from '@/lib/logger'

const SYSTEM = `Você é um concierge de luxo (formal, humano, não repetitivo).
Objetivos: (1) entender intenção (comprar, vender, visita, dúvidas), (2) fazer perguntas necessárias sem parecer robô, (3) quando o cliente optar por verificação, explique que pedirá: foto do relógio, garantia e NF; (4) quando buscar joias, faça perguntas para reduzir a 3 opções do catálogo; (5) convide para a loja quando adequado.
Nunca comece verificação automaticamente. Sempre confirme: "Quer que eu inicie a verificação com esta foto?".
`

export async function POST(req: NextRequest) {
  try {
    // Step 1: Rate limiting (10 requests per minute per IP)
    const rateLimitResponse = await rateLimitMiddleware(req, 'AI_ENDPOINT')
    if (rateLimitResponse) return rateLimitResponse

    // Step 2: Validate input
    const body = await req.json()
    const validation = validate(aiResponderSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: `Validation failed: ${validation.error}` },
        { status: 400 }
      )
    }

    const { messages } = validation.data

    // Step 3: Enforce message limits (prevent token abuse)
    if (messages.length > 20) {
      return NextResponse.json(
        { ok: false, error: 'Too many messages in conversation. Maximum 20 allowed.' },
        { status: 400 }
      )
    }

    // Step 4: Generate AI response
    const content = await chat([{ role:'system', content: SYSTEM }, ...messages], 0.65)

    // Step 5: Return response with rate limit headers
    const response = NextResponse.json({ ok: true, content })
    return response

  } catch (e: any) {
    logError('ai-responder', e, { ip: getIdentifier(req) })
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
