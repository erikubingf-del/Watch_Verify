import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'260px 1fr', minHeight:'100vh'}}>
      <aside style={{borderRight:'1px solid #1f2937', padding:'24px', background:'#0b0f1a'}}>
        <h2 style={{fontWeight:700, fontSize:18, marginBottom:8}}>Watch Verify</h2>
        <p style={{opacity:.6, fontSize:12, marginBottom:24}}>Concierge & Verificação</p>
        <nav style={{display:'grid', gap:10}}>
          <Link href="/dashboard/watch-verify">✅ Watch Verify</Link>
          <Link href="/dashboard/customers">👤 Customers</Link>
          <Link href="/dashboard/reports">📈 Reports</Link>
          <Link href="/dashboard/settings">⚙️ Settings</Link>
        </nav>
      </aside>
      <main style={{padding:'24px'}}>{children}</main>
    </div>
  );
}
