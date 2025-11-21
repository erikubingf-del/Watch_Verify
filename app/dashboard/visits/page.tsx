'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface Visit {
  id: string
  customer_name: string
  customer_phone: string
  scheduled_at: string
  product_interest?: string
  assigned_salesperson?: string
  salesperson_id?: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  created_at: string
  notes?: string
}

interface Salesperson {
  id: string
  name: string
  phone: string
  availability_score: 'low' | 'medium' | 'high'
  appointments_count: number
  working_hours?: string
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')

  const [filters, setFilters] = useState({
    status: 'all',
    salesperson: 'all',
    dateRange: 'upcoming',
    search: ''
  })

  // Fetch visits and salespeople
  useEffect(() => {
    async function loadData() {
      try {
        const [visitsRes, salespeopleRes] = await Promise.all([
          fetch('/api/dashboard/visits'),
          fetch('/api/dashboard/salespeople')
        ])

        if (visitsRes.ok) {
          const data = await visitsRes.json()
          setVisits(data.visits || [])
        }

        if (salespeopleRes.ok) {
          const data = await salespeopleRes.json()
          setSalespeople(data.salespeople || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter visits
  const filteredVisits = visits.filter(v => {
    if (filters.status !== 'all' && v.status !== filters.status) return false
    if (filters.salesperson !== 'all' && v.salesperson_id !== filters.salesperson) return false
    if (filters.search &&
        !v.customer_name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !v.customer_phone.includes(filters.search)) return false

    // Date range filtering
    const visitDate = new Date(v.scheduled_at)
    const now = new Date()
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (filters.dateRange === 'upcoming') {
      return visitDate >= now && visitDate <= next7Days
    } else if (filters.dateRange === 'past') {
      return visitDate < now
    } else if (filters.dateRange === 'all') {
      return true
    }

    return true
  }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  // Stats
  const stats = {
    total: visits.length,
    upcoming: visits.filter(v => new Date(v.scheduled_at) >= new Date() && v.status !== 'cancelled' && v.status !== 'completed').length,
    confirmed: visits.filter(v => v.status === 'confirmed').length,
    pending: visits.filter(v => v.status === 'pending').length,
    unassigned: visits.filter(v => !v.assigned_salesperson).length,
  }

  function getStatusBadge(status: string) {
    const badges = {
      confirmed: { label: 'Confirmado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      completed: { label: 'Concluído', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  function getDaysUntilVisit(scheduledAt: string): string {
    const visitDate = new Date(scheduledAt)
    const now = new Date()
    const diffDays = Math.ceil((visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás`
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Amanhã'
    return `Em ${diffDays} dias`
  }

  function getAvailabilityBadge(score: 'low' | 'medium' | 'high') {
    const badges = {
      low: { label: 'Baixa', color: 'bg-red-500/10 text-red-400' },
      medium: { label: 'Média', color: 'bg-yellow-500/10 text-yellow-400' },
      high: { label: 'Alta', color: 'bg-green-500/10 text-green-400' },
    }
    const badge = badges[score]
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  async function assignSalesperson(visitId: string, salespersonId: string) {
    try {
      const res = await fetch('/api/dashboard/visits/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, salespersonId })
      })

      if (res.ok) {
        // Reload visits
        const visitsRes = await fetch('/api/dashboard/visits')
        if (visitsRes.ok) {
          const data = await visitsRes.json()
          setVisits(data.visits || [])
        }
        setShowAssignModal(false)
        setSelectedVisit(null)
      } else {
        alert('Erro ao atribuir vendedor')
      }
    } catch (error) {
      console.error('Error assigning salesperson:', error)
      alert('Erro ao atribuir vendedor')
    }
  }

  async function autoAssignAll() {
    try {
      const res = await fetch('/api/dashboard/visits/auto-assign', {
        method: 'POST'
      })

      if (res.ok) {
        // Reload visits
        const visitsRes = await fetch('/api/dashboard/visits')
        if (visitsRes.ok) {
          const data = await visitsRes.json()
          setVisits(data.visits || [])
        }
        alert('Visitas atribuídas automaticamente com sucesso!')
      } else {
        alert('Erro ao atribuir visitas automaticamente')
      }
    } catch (error) {
      console.error('Error auto-assigning:', error)
      alert('Erro ao atribuir visitas automaticamente')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-zinc-400 mt-4">Carregando visitas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Visitas Agendadas</h1>
          <p className="text-zinc-400 mt-2">Gerencie appointments e atribua vendedores</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Calendário
            </button>
          </div>
          {stats.unassigned > 0 && (
            <button
              onClick={autoAssignAll}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>⚡</span>
              Auto-Atribuir ({stats.unassigned})
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Próximos 7 Dias</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.upcoming}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Confirmados</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.confirmed}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Sem Vendedor</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.unassigned}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Cliente ou telefone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="confirmed">Confirmado</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
              <option value="completed">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vendedor</label>
            <select
              value={filters.salesperson}
              onChange={(e) => setFilters({ ...filters, salesperson: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {salespeople.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Período</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="upcoming">Próximas (7 dias)</option>
              <option value="all">Todas</option>
              <option value="past">Passadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visits Table */}
      {viewMode === 'table' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {filteredVisits.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500">Nenhuma visita encontrada</p>
              <p className="text-sm text-zinc-600 mt-2">
                {filters.search || filters.status !== 'all' || filters.salesperson !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Quando clientes agendarem visitas via WhatsApp, elas aparecerão aqui'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-950">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Interesse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Dias Até Visita
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredVisits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedVisit(visit)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{visit.customer_name || 'Cliente sem nome'}</div>
                        <a
                          href={`https://wa.me/${visit.customer_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {visit.customer_phone}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {new Date(visit.scheduled_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {new Date(visit.scheduled_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-300 max-w-xs truncate">
                          {visit.product_interest || 'Não especificado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visit.assigned_salesperson ? (
                          <div className="text-sm text-white">{visit.assigned_salesperson}</div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedVisit(visit)
                              setShowAssignModal(true)
                            }}
                            className="text-sm text-yellow-400 hover:text-yellow-300 font-medium"
                          >
                            Atribuir →
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(visit.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-zinc-400">{getDaysUntilVisit(visit.scheduled_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedVisit(visit)
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredVisits.length > 0 && (
            <div className="px-6 py-4 border-t border-zinc-800">
              <div className="text-sm text-zinc-400">
                Mostrando {filteredVisits.length} de {visits.length} visitas
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View Placeholder */}
      {viewMode === 'calendar' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <p className="text-zinc-500 text-lg">📅 Visualização de Calendário</p>
          <p className="text-sm text-zinc-600 mt-2">Em desenvolvimento - disponível em breve</p>
        </div>
      )}

      {/* Assign Salesperson Modal */}
      {showAssignModal && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Atribuir Vendedor</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Cliente: <span className="text-white font-medium">{selectedVisit.customer_name}</span><br/>
              Data: {new Date(selectedVisit.scheduled_at).toLocaleString('pt-BR')}
            </p>

            <div className="space-y-3 mb-6 max-h-96 overflow-auto">
              {salespeople.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => assignSalesperson(selectedVisit.id, sp.id)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{sp.name}</span>
                    {getAvailabilityBadge(sp.availability_score)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {sp.appointments_count} visitas agendadas hoje
                  </div>
                  {sp.working_hours && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Horário: {sp.working_hours}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedVisit(null)
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {selectedVisit && !showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedVisit.customer_name || 'Cliente sem nome'}</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {new Date(selectedVisit.scheduled_at).toLocaleString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-zinc-500">Status</p>
                  <div className="mt-2">{getStatusBadge(selectedVisit.status)}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-zinc-500">Vendedor Atribuído</p>
                  <p className="text-white font-medium mt-1">
                    {selectedVisit.assigned_salesperson || 'Não atribuído'}
                  </p>
                </div>
              </div>

              {selectedVisit.product_interest && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Produto de Interesse</h3>
                  <p className="text-white">{selectedVisit.product_interest}</p>
                </div>
              )}

              {selectedVisit.notes && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Notas</h3>
                  <p className="text-zinc-300">{selectedVisit.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <a
                  href={`https://wa.me/${selectedVisit.customer_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-center transition-colors"
                >
                  Enviar WhatsApp
                </a>
                {!selectedVisit.assigned_salesperson && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Atribuir Vendedor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
