import { NextRequest, NextResponse } from 'next/server'
import { atSelect, atUpdate } from '@/utils/airtable'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) throw new Error('phone required')
    const found = await atSelect('Customers', { filterByFormula: `({phone}='${phone}')` })
    if (!found.length) return NextResponse.json({ ok:true, deleted:0 })
    // soft-delete: mark as deleted_at
    const updated = await Promise.all(found.map(r => atUpdate('Customers', r.id, { deleted_at: new Date().toISOString() })))
    return NextResponse.json({ ok:true, deleted: updated.length })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 400 })
  }
}
