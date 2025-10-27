import { NextRequest, NextResponse } from 'next/server'
import { embedText } from '@/utils/openai'

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, items } = await req.json()
    // mock: generate embeddings, log only
    const out = []
    for (const it of items||[]) {
      const emb = await embedText([it.text, it.title, it.tags?.join(' ')].filter(Boolean).join('\n'))
      out.push({ id: it.id || crypto.randomUUID(), vector: emb.slice(0,8), meta: { tenant_id, title: it.title||'', tags: it.tags||[] } })
    }
    return NextResponse.json({ ok:true, indexed: out.length })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 400 })
  }
}
