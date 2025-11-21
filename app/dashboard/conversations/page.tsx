'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface Conversation {
  id: string
  customer_name: string
  customer_phone: string
  last_message_time: string
  interest_summary: string
  products_shown: string[]
  visit_scheduled: boolean
  visit_date?: string
  status: 'active' | 'scheduled' | 'converted' | 'inactive'
  message_count: number
  last_interaction: string
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'recent'
  })

  // Fetch conversations from API
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/dashboard/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations || [])
        }
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [])

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter(c => {
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.search &&
          !c.customer_name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !c.customer_phone.includes(filters.search)) return false
      return true
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'recent':
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        case 'scheduled':
          if (!a.visit_date) return 1
          if (!b.visit_date) return -1
          return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
        case 'interest':
          return b.message_count - a.message_count
        default:
          return 0
      }
    })

  // Stats
  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'active').length,
    scheduled: conversations.filter(c => c.status === 'scheduled').length,
    converted: conversations.filter(c => c.status === 'converted').length,
    inactive: conversations.filter(c => c.status === 'inactive').length,
  }

  function getStatusBadge(status: string) {
    const badges = {
      active: { label: 'Ativo', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      scheduled: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      converted: { label: 'Convertido', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      inactive: { label: 'Inativo', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    }
    const badge = badges[status as keyof typeof badges] || badges.active
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  function formatRelativeTime(dateString: string) {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  function exportToCSV() {
    const headers = ['Cliente', 'Telefone', 'Status', 'Resumo de Interesse', 'Produtos', 'Visita Agendada', 'Data da Visita', 'Última Interação']
    const rows = filteredConversations.map(c => [
      c.customer_name,
      c.customer_phone,
      c.status,
      c.interest_summary,
      c.products_shown.join('; '),
      c.visit_scheduled ? 'Sim' : 'Não',
      c.visit_date || 'N/A',
      c.last_interaction
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `conversas_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-zinc-400 mt-4">Carregando conversas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Conversas</h1>
        <p className="text-zinc-400 mt-2">Visão geral de todas as interações com clientes via WhatsApp</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Ativos</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Agendados</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.scheduled}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Convertidos</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.converted}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Inativos</div>
          <div className="text-2xl font-bold text-zinc-500 mt-1">{stats.inactive}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome ou telefone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="scheduled">Agendados</option>
              <option value="converted">Convertidos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Ordenar por</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Mais Recente</option>
              <option value="scheduled">Visita Agendada</option>
              <option value="interest">Nível de Interesse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500">Nenhuma conversa encontrada</p>
            <p className="text-sm text-zinc-600 mt-2">
              {filters.search || filters.status !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Quando clientes iniciarem conversas via WhatsApp, elas aparecerão aqui'}
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
                    Resumo de Interesse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Produtos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Visita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Última Interação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredConversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{conversation.customer_name || 'Cliente sem nome'}</div>
                      <div className="text-xs text-zinc-500">{conversation.customer_phone}</div>
                      <div className="text-xs text-zinc-600 mt-1">{conversation.message_count} mensagens</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300 max-w-md line-clamp-2">
                        {conversation.interest_summary || 'Aguardando análise...'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {conversation.products_shown.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {conversation.products_shown.slice(0, 2).map((product, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded">
                              {product}
                            </span>
                          ))}
                          {conversation.products_shown.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 text-xs bg-zinc-700 text-zinc-400 rounded">
                              +{conversation.products_shown.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">Nenhum produto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {conversation.visit_scheduled ? (
                        <div>
                          <div className="text-sm text-green-400 font-medium">✓ Sim</div>
                          {conversation.visit_date && (
                            <div className="text-xs text-zinc-500 mt-1">
                              {new Date(conversation.visit_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">Não agendada</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conversation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">{formatRelativeTime(conversation.last_message_time)}</div>
                      <div className="text-xs text-zinc-600">
                        {new Date(conversation.last_message_time).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedConversation(conversation)
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium"
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

        {/* Footer */}
        {filteredConversations.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Mostrando {filteredConversations.length} de {conversations.length} conversas
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedConversation.customer_name || 'Cliente sem nome'}</h2>
                <p className="text-sm text-zinc-400 mt-1">{selectedConversation.customer_phone}</p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Resumo da Conversa</h3>
                <p className="text-white">{selectedConversation.interest_summary || 'Aguardando análise de IA...'}</p>
              </div>

              {/* Products */}
              {selectedConversation.products_shown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Produtos Mostrados</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.products_shown.map((product, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-zinc-800 text-white rounded-lg">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Visit Info */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Informações de Visita</h3>
                {selectedConversation.visit_scheduled ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 font-medium">Visita Agendada</p>
                    {selectedConversation.visit_date && (
                      <p className="text-white mt-1">
                        {new Date(selectedConversation.visit_date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <p className="text-zinc-400">Nenhuma visita agendada</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Status</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedConversation.status)}
                  <span className="text-sm text-zinc-400">
                    Última interação {formatRelativeTime(selectedConversation.last_message_time)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400">Total de Mensagens</p>
                  <p className="text-2xl font-bold text-white mt-1">{selectedConversation.message_count}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-sm text-zinc-400">Produtos de Interesse</p>
                  <p className="text-2xl font-bold text-white mt-1">{selectedConversation.products_shown.length}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <a
                  href={`https://wa.me/${selectedConversation.customer_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-center transition-colors"
                >
                  Enviar WhatsApp
                </a>
                <a
                  href={`/dashboard/messages?customer=${encodeURIComponent(selectedConversation.customer_phone)}`}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center transition-colors"
                >
                  Ver Histórico Completo
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
