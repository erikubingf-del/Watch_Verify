import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/dashboard/catalog', label: 'Catálogo', icon: '📦' },
    { href: '/dashboard/verifications', label: 'Verificações', icon: '✅' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
    { href: '/dashboard/customers', label: 'Clientes', icon: '👤' },
    { href: '/dashboard/messages', label: 'Mensagens', icon: '💬' },
    { href: '/dashboard/settings', label: 'Configurações', icon: '⚙️' },
  ]

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Watch Verify</h2>
          <p className="text-sm text-zinc-400 mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-zinc-800">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{session.user?.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{session.user?.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
