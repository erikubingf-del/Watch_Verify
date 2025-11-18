import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/utils/openai'
import { validate, aiResponderSchema } from '@/lib/validations'
import { rateLimitMiddleware, getIdentifier } from '@/lib/ratelimit'
import { logError, logInfo } from '@/lib/logger'
import { buildRAGContext } from '@/lib/rag'

const BASE_SYSTEM = `Você é um concierge de luxo (formal, humano, não repetitivo).
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

    const { messages, tenantId, customerPhone } = validation.data

    // Step 3: Enforce message limits (prevent token abuse)
    if (messages.length > 20) {
      return NextResponse.json(
        { ok: false, error: 'Too many messages in conversation. Maximum 20 allowed.' },
        { status: 400 }
      )
    }

    // Step 4: Build RAG context (semantic search + conversation history)
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content || ''

    let ragContext
    let systemPrompt = BASE_SYSTEM

    try {
      ragContext = await buildRAGContext(lastUserMessage, {
        tenantId,
        customerPhone,
        includeConversationHistory: false, // Messages already in request
      })

      // Use enhanced system prompt with catalog context
      systemPrompt = ragContext.systemPrompt

      logInfo('ai-responder-rag', 'RAG context built successfully', {
        searchPerformed: ragContext.searchPerformed,
        productsFound: ragContext.relevantProducts.length,
      })
    } catch (error: any) {
      // RAG is enhancement, not critical - fall back to base system prompt
      logError('rag-context-build', error, { message: lastUserMessage })
    }

    // Step 5: Generate AI response with RAG-enhanced context
    const content = await chat(
      [{ role: 'system', content: systemPrompt }, ...messages],
      0.65
    )

    // Step 6: Return response with product recommendations
    const response = NextResponse.json({
      ok: true,
      content,
      ...(ragContext && {
        products: ragContext.relevantProducts,
        searchPerformed: ragContext.searchPerformed,
      }),
    })

    return response
  } catch (e: any) {
    logError('ai-responder', e, { ip: getIdentifier(req) })
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
