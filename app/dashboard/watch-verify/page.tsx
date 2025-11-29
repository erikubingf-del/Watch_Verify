'use client'
import { useEffect, useState } from 'react'

type Item = {
  id: string
  customer?: string
  phone?: string
  brand?: string
  model?: string
  reference?: string
  serial?: string
  icd?: number
  status?: string
  created_at?: string
}

export const dynamic = 'force-dynamic'

export default function WatchVerifyPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/export?scope=today')
        const data = await res.json()
        setItems(data.rows || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Watch Verify</h1>
      <p style={{ opacity: .7, marginBottom: 16 }}>Casos recentes e índice ICD (interno).</p>

      {loading ? <p>Carregando…</p> : (
        <div style={{ border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: '#0f172a' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 12 }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Telefone</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Relógio</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Ref/Serial</th>
                <th style={{ textAlign: 'left', padding: 12 }}>ICD</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Status</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={{ padding: 12 }}>{r.customer || '—'}</td>
                  <td style={{ padding: 12 }}>{r.phone || '—'}</td>
                  <td style={{ padding: 12 }}>{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</td>
                  <td style={{ padding: 12 }}>{[r.reference, r.serial].filter(Boolean).join(' / ') || '—'}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{typeof r.icd === 'number' ? r.icd : '—'}</td>
                  <td style={{ padding: 12 }}>{r.status || '—'}</td>
                  <td style={{ padding: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
