import { NextRequest, NextResponse } from 'next/server'
import { atSelect } from '@/utils/airtable'
import { toCSV } from '@/utils/csvExporter'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'today' // 'today' | 'customers' | 'month'
  try {
    if (scope==='customers') {
      const rows = await atSelect('Customers', { maxRecords: '100', sort: '[{"field":"created_at","direction":"desc"}]' })
      const out = (rows as any[]).map(r => ({
        id: r.id,
        name: r.fields.name||'',
        phone: r.fields.phone||'',
        last_interest: r.fields.last_interest||'',
        created_at: r.fields.created_at||''
      }))
      return NextResponse.json({ ok:true, rows: out })
    }
    // watch verify (today/month)
    const rows = await atSelect('WatchVerify', { maxRecords: '200', sort: '[{"field":"created_at","direction":"desc"}]' })
    const today = new Date().toISOString().slice(0,10)
    const out = (rows as any[]).map(r => ({
      id: r.id,
      customer: r.fields.customer||'',
      phone: r.fields.phone||'',
      brand: r.fields.brand||'',
      model: r.fields.model||'',
      reference: r.fields.reference||'',
      serial: r.fields.serial||'',
      icd: r.fields.icd||'',
      status: r.fields.status||'',
      created_at: r.fields.created_at||''
    })).filter(r => scope==='month' ? (r.created_at||'').startsWith(today.slice(0,7)) : (r.created_at||'').startsWith(today))

    if (searchParams.get('format') === 'csv') {
      const csv = toCSV(out)
      return new NextResponse(csv, { headers: { 'content-type':'text/csv', 'content-disposition': `attachment; filename="watchverify_${scope}.csv"` } })
    }

    return NextResponse.json({ ok:true, rows: out })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e.message }, { status: 400 })
  }
}
