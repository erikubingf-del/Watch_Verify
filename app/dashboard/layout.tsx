import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'260px 1fr', minHeight:'100vh'}}>
      <aside style={{borderRight:'1px solid #1f2937', padding:'24px', background:'#0b0f1a', display:'flex', flexDirection:'column'}}>
        <div style={{flex: 1}}>
          <h2 style={{fontWeight:700, fontSize:18, marginBottom:8}}>Watch Verify</h2>
          <p style={{opacity:.6, fontSize:12, marginBottom:24}}>Concierge & Verificação</p>
          <nav style={{display:'grid', gap:10}}>
            <Link href="/dashboard/watch-verify">✅ Watch Verify</Link>
            <Link href="/dashboard/customers">👤 Customers</Link>
            <Link href="/dashboard/reports">📈 Reports</Link>
            <Link href="/dashboard/settings">⚙️ Settings</Link>
          </nav>
        </div>
        <div style={{marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #1f2937'}}>
          <p style={{fontSize: 12, opacity: 0.6, marginBottom: 8}}>{session.user?.name}</p>
          <p style={{fontSize: 11, opacity: 0.4, marginBottom: 12}}>{session.user?.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main style={{padding:'24px'}}>{children}</main>
    </div>
  )
}
