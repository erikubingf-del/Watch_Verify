import Link from 'next/link';

export default function Home() {
  return (
    <main style={{padding:'40px'}}>
      <h1 style={{fontSize:28, fontWeight:700, marginBottom:8}}>Watch Verify</h1>
      <p style={{opacity:.8, marginBottom:24}}>Concierge de luxo e verificação documental — white-label.</p>
      <div style={{display:'flex', gap:12}}>
        <Link href="/dashboard/watch-verify" style={{padding:'10px 14px', background:'#111827', border:'1px solid #1f2937', borderRadius:8}}>Abrir Dashboard</Link>
        <Link href="/dashboard/customers" style={{padding:'10px 14px', background:'#111827', border:'1px solid #1f2937', borderRadius:8}}>Clientes</Link>
        <Link href="/dashboard/reports" style={{padding:'10px 14px', background:'#111827', border:'1px solid #1f2937', borderRadius:8}}>Relatórios</Link>
        <Link href="/dashboard/settings" style={{padding:'10px 14px', background:'#111827', border:'1px solid #1f2937', borderRadius:8}}>Configurações</Link>
      </div>
    </main>
  )
}
