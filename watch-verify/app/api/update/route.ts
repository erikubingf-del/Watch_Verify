import { NextRequest, NextResponse } from 'next/server'
import { atCreate, atUpdate } from '@/utils/airtable'

export async function POST(req: NextRequest) {
  try {
    const { action, table='Settings', id, fields } = await req.json()
    if (action==='save_settings') {
      if (id) {
        const r = await atUpdate(table, id, fields||{})
        return NextResponse.json({ ok:true, id:r.id })
      } else {
        const r = await atCreate(table, fields||{})
        return NextResponse.json({ ok:true, id:r.id })
      }
    }
    return NextResponse.json({ ok:false, error:'unknown action' }, { status: 400 })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 400 })
  }
}
