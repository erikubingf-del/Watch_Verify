'use client'
import { useEffect, useState } from 'react'

type Customer = {
  id: string
  name?: string
  phone?: string
  last_interest?: string
  created_at?: string
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/export?scope=customers')
        const data = await res.json()
        setItems(data.rows||[])
      } catch (e) { console.error(e) }
    })()
  }, [])

  return (
    <div>
      <h1 style={{fontSize:22, fontWeight:700, marginBottom:12}}>Clientes</h1>
      <div style={{border:'1px solid #1f2937', borderRadius:12, overflow:'hidden'}}>
        <table style={{width:'100%'}}>
          <thead style={{background:'#0f172a'}}>
            <tr>
              <th style={{textAlign:'left', padding:12}}>Nome</th>
              <th style={{textAlign:'left', padding:12}}>Telefone</th>
              <th style={{textAlign:'left', padding:12}}>Último interesse</th>
              <th style={{textAlign:'left', padding:12}}>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i)=>(
              <tr key={i} style={{borderTop:'1px solid #1f2937'}}>
                <td style={{padding:12}}>{c.name||'—'}</td>
                <td style={{padding:12}}>{c.phone||'—'}</td>
                <td style={{padding:12}}>{c.last_interest||'—'}</td>
                <td style={{padding:12}}>{c.created_at? new Date(c.created_at).toLocaleString():'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
