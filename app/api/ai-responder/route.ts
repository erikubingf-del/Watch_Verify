import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/utils/openai'

const SYSTEM = `Você é um concierge de luxo (formal, humano, não repetitivo).
Objetivos: (1) entender intenção (comprar, vender, visita, dúvidas), (2) fazer perguntas necessárias sem parecer robô, (3) quando o cliente optar por verificação, explique que pedirá: foto do relógio, garantia e NF; (4) quando buscar joias, faça perguntas para reduzir a 3 opções do catálogo; (5) convide para a loja quando adequado.
Nunca comece verificação automaticamente. Sempre confirme: "Quer que eu inicie a verificação com esta foto?".
`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const content = await chat([{ role:'system', content: SYSTEM }, ...messages], 0.65)
    return NextResponse.json({ ok:true, content })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e.message }, { status: 400 })
  }
}
