import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardHome() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Mock stats - in production, these would come from API calls
  const stats = {
    totalProducts: 47,
    totalVerifications: 124,
    avgICD: 87.3,
    activeCustomers: 238,
  }

  const recentVerifications = [
    { id: '1', customer: 'João Silva', brand: 'Rolex', model: 'Submariner', icd: 92, status: 'approved', date: '2024-01-20' },
    { id: '2', customer: 'Maria Santos', brand: 'Omega', model: 'Seamaster', icd: 78, status: 'approved', date: '2024-01-19' },
    { id: '3', customer: 'Pedro Costa', brand: 'Cartier', model: 'Santos', icd: 65, status: 'manual_review', date: '2024-01-19' },
    { id: '4', customer: 'Ana Lima', brand: 'Patek Philippe', model: 'Calatrava', icd: 95, status: 'approved', date: '2024-01-18' },
    { id: '5', customer: 'Carlos Mendes', brand: 'Rolex', model: 'GMT-Master II', icd: 42, status: 'rejected', date: '2024-01-18' },
  ]

  function getICDColor(icd: number) {
    if (icd >= 90) return 'text-green-400'
    if (icd >= 70) return 'text-yellow-400'
    if (icd >= 41) return 'text-orange-400'
    return 'text-red-400'
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { label: string; color: string }> = {
      approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      manual_review: { label: 'Revisão Manual', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    }
    const badge = badges[status] || badges.approved
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-2">Bem-vindo de volta, {session.user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Produtos</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalProducts}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            <Link href="/dashboard/catalog" className="text-blue-400 hover:text-blue-300">
              Gerenciar catálogo →
            </Link>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Verificações (mês)</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalVerifications}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            <Link href="/dashboard/verifications" className="text-blue-400 hover:text-blue-300">
              Ver todas →
            </Link>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">ICD Médio</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.avgICD}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            <Link href="/dashboard/analytics" className="text-blue-400 hover:text-blue-300">
              Ver analytics →
            </Link>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Clientes Ativos</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.activeCustomers}</p>
            </div>
            <div className="text-4xl">👤</div>
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            <Link href="/dashboard/customers" className="text-blue-400 hover:text-blue-300">
              Ver clientes →
            </Link>
          </p>
        </div>
      </div>

      {/* Recent Verifications */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Verificações Recentes</h2>
          <p className="text-sm text-zinc-400 mt-1">Últimas 5 verificações processadas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Relógio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  ICD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentVerifications.map((verification) => (
                <tr key={verification.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {verification.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {verification.brand} {verification.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${getICDColor(verification.icd)}`}>
                      {verification.icd}/100
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(verification.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                    {new Date(verification.date).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <Link
            href="/dashboard/verifications"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Ver todas as verificações →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/catalog"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors group"
        >
          <div className="text-3xl mb-3">📦</div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Gerenciar Catálogo
          </h3>
          <p className="text-sm text-zinc-400 mt-2">
            Adicionar, editar ou remover produtos do catálogo
          </p>
        </Link>

        <Link
          href="/dashboard/catalog"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors group"
        >
          <div className="text-3xl mb-3">🔄</div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Sincronizar Embeddings
          </h3>
          <p className="text-sm text-zinc-400 mt-2">
            Gerar embeddings para novos produtos
          </p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors group"
        >
          <div className="text-3xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            Ver Analytics
          </h3>
          <p className="text-sm text-zinc-400 mt-2">
            Métricas, gráficos e relatórios detalhados
          </p>
        </Link>
      </div>

      {/* System Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Status do Sistema</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">API OpenAI</span>
            <span className="flex items-center gap-2 text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Operacional
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Airtable Database</span>
            <span className="flex items-center gap-2 text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Conectado
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Twilio WhatsApp</span>
            <span className="flex items-center gap-2 text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Ativo
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Embeddings Sync</span>
            <span className="flex items-center gap-2 text-sm text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              73 produtos pendentes
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
