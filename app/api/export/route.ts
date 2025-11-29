import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toCSV } from '@/utils/csvExporter'

// Force dynamic to ensure fresh data
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'today' // 'today' | 'customers' | 'month'

  try {
    if (scope === 'customers') {
      const customers = await prisma.customer.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: true
        }
      })

      const out = customers.map((c: any) => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        last_interest: (c.profile as any)?.interests?.[0] || '',
        created_at: c.createdAt.toISOString()
      }))

      return NextResponse.json({ ok: true, rows: out })
    }

    // watch verify (today/month)
    const verifications = await prisma.watchVerify.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' }
    })

    const today = new Date().toISOString().slice(0, 10)

    const out = verifications.map((v: any) => ({
      id: v.id,
      customer: v.customerName || '',
      phone: v.customerPhone || '',
      brand: v.brand || '',
      model: v.model || '',
      reference: v.reference || '',
      serial: v.serial || '',
      icd: v.icd?.toString() || '',
      status: v.status || '',
      created_at: v.createdAt.toISOString()
    })).filter((r: any) => {
      const dateStr = r.created_at
      return scope === 'month'
        ? dateStr.startsWith(today.slice(0, 7))
        : dateStr.startsWith(today)
    })

    if (searchParams.get('format') === 'csv') {
      const csv = toCSV(out)
      return new NextResponse(csv, {
        headers: {
          'content-type': 'text/csv',
          'content-disposition': `attachment; filename="watchverify_${scope}.csv"`
        }
      })
    }

    return NextResponse.json({ ok: true, rows: out })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
