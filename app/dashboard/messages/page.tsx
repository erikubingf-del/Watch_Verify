'use client'

import { useState } from 'react'
import { formatDate, formatDateRelative } from '@/lib/dashboard-utils'

export default function MessagesPage() {
  // Mock message data - in production would fetch from Airtable
  const [messages] = useState([
    { id: '1', customer: 'João Silva', phone: '+5511988888888', content: 'Olá! Gostaria de verificar um Rolex Submariner.', direction: 'inbound', timestamp: '2024-01-20T15:30:00Z', status: 'delivered' },
    { id: '2', customer: 'João Silva', phone: '+5511988888888', content: 'Claro! Por favor, envie fotos do relógio, certificado de garantia e nota fiscal.', direction: 'outbound', timestamp: '2024-01-20T15:31:00Z', status: 'delivered' },
    { id: '3', customer: 'João Silva', phone: '+5511988888888', content: '[Foto do relógio enviada]', direction: 'inbound', timestamp: '2024-01-20T15:35:00Z', status: 'delivered', hasMedia: true },
    { id: '4', customer: 'Maria Santos', phone: '+5511977777777', content: 'Quanto custa a verificação?', direction: 'inbound', timestamp: '2024-01-19T14:20:00Z', status: 'delivered' },
    { id: '5', customer: 'Maria Santos', phone: '+5511977777777', content: 'A verificação é gratuita! Basta enviar os documentos do relógio.', direction: 'outbound', timestamp: '2024-01-19T14:22:00Z', status: 'delivered' },
    { id: '6', customer: 'Pedro Costa', phone: '+5511966666666', content: 'Recebi o relatório. Muito obrigado!', direction: 'inbound', timestamp: '2024-01-19T10:15:00Z', status: 'delivered' },
    { id: '7', customer: 'Ana Lima', phone: '+5511955555555', content: 'Tenho um Patek Philippe para verificar.', direction: 'inbound', timestamp: '2024-01-18T16:45:00Z', status: 'delivered' },
    { id: '8', customer: 'Ana Lima', phone: '+5511955555555', content: 'Excelente! Vou iniciar o processo. Por favor, envie as fotos.', direction: 'outbound', timestamp: '2024-01-18T16:46:00Z', status: 'delivered' },
    { id: '9', customer: 'Carlos Mendes', phone: '+5511944444444', content: 'O ICD score foi 42. O que significa?', direction: 'inbound', timestamp: '2024-01-18T11:30:00Z', status: 'delivered' },
    { id: '10', customer: 'Carlos Mendes', phone: '+5511944444444', content: 'Um ICD score de 42 indica inconsistências na documentação. Recomendamos revisão manual.', direction: 'outbound', timestamp: '2024-01-18T11:35:00Z', status: 'delivered' },
    { id: '11', customer: 'Juliana Souza', phone: '+5511933333333', content: 'Vocês verificam IWC também?', direction: 'inbound', timestamp: '2024-01-17T13:20:00Z', status: 'delivered' },
    { id: '12', customer: 'Juliana Souza', phone: '+5511933333333', content: 'Sim! Verificamos todas as marcas de relógios de luxo.', direction: 'outbound', timestamp: '2024-01-17T13:22:00Z', status: 'delivered' },
  ])

  const [filter, setFilter] = useState({
    customer: 'all',
    direction: 'all',
    search: ''
  })

  // Get unique customers
  const customers = Array.from(new Set(messages.map(m => m.customer)))

  // Filter messages
  const filteredMessages = messages.filter(m => {
    if (filter.customer !== 'all' && m.customer !== filter.customer) return false
    if (filter.direction !== 'all' && m.direction !== filter.direction) return false
    if (filter.search && !m.content.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  // Calculate stats
  const stats = {
    total: messages.length,
    inbound: messages.filter(m => m.direction === 'inbound').length,
    outbound: messages.filter(m => m.direction === 'outbound').length,
    uniqueCustomers: customers.length
  }

  function getDirectionBadge(direction: string) {
    if (direction === 'inbound') {
      return <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">Recebida</span>
    }
    return <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-green-500/10 text-green-400 border-green-500/20">Enviada</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Mensagens</h1>
        <p className="text-zinc-400 mt-2">Histórico de conversas via WhatsApp</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Recebidas</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.inbound}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Enviadas</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.outbound}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Clientes Únicos</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.uniqueCustomers}</div>
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
              placeholder="Conteúdo da mensagem..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Cliente</label>
            <select
              value={filter.customer}
              onChange={(e) => setFilter({ ...filter, customer: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              {customers.map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Direção</label>
            <select
              value={filter.direction}
              onChange={(e) => setFilter({ ...filter, direction: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="inbound">Recebidas</option>
              <option value="outbound">Enviadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Mensagem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Direção
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Horário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredMessages.map((message) => (
                <tr key={message.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{message.customer}</div>
                    <div className="text-xs text-zinc-500">{message.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-300 max-w-md">
                      {message.hasMedia && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-zinc-800 rounded mr-2">
                          📷 Mídia
                        </span>
                      )}
                      {message.content}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDirectionBadge(message.direction)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-zinc-400">{formatDateRelative(message.timestamp)}</div>
                    <div className="text-xs text-zinc-500">{formatDate(message.timestamp)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-zinc-500">{message.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Mostrando {filteredMessages.length} de {messages.length} mensagens
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors">
              Anterior
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
            <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
          Exportar Conversas
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Atualizar
        </button>
      </div>
    </div>
  )
}
