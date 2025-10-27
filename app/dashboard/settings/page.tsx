'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [logo, setLogo] = useState('')
  const [brand, setBrand] = useState('Sua Boutique')
  const [primary, setPrimary] = useState('#0ea5e9')

  const save = async () => {
    await fetch('/api/update', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'save_settings', brand, logo, primary }) })
    alert('Configurações salvas (Airtable)')
  }

  return (
    <div>
      <h1 style={{fontSize:22, fontWeight:700, marginBottom:12}}>Configurações (White label)</h1>
      <div style={{display:'grid', gap:12, maxWidth:560}}>
        <label>Nome da loja
          <input value={brand} onChange={e=>setBrand(e.target.value)} style={{width:'100%', padding:8, background:'#0b1220', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8}}/>
        </label>
        <label>Logo URL
          <input value={logo} onChange={e=>setLogo(e.target.value)} style={{width:'100%', padding:8, background:'#0b1220', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8}}/>
        </label>
        <label>Cor primária
          <input value={primary} onChange={e=>setPrimary(e.target.value)} style={{width:'100%', padding:8, background:'#0b1220', color:'#e5e5e5', border:'1px solid #1f2937', borderRadius:8}}/>
        </label>
        <button onClick={save} style={{padding:'10px 14px', background:'#111827', border:'1px solid #1f2937', borderRadius:8}}>Salvar</button>
      </div>
    </div>
  )
}
