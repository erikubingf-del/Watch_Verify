'use client'

import { useState } from 'react'
import { formatDate, formatDateRelative } from '@/lib/dashboard-utils'

export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  // Mock customer data - in production would fetch from Airtable
  const [customers] = useState([
    { id: '1', name: 'João Silva', phone: '+5511988888888', email: 'joao@example.com', lastInterest: 'Rolex Submariner', messages: 12, verifications: 2, lastActivity: '2024-01-20T15:30:00Z', status: 'active' },
    { id: '2', name: 'Maria Santos', phone: '+5511977777777', email: 'maria@example.com', lastInterest: 'Omega Seamaster', messages: 8, verifications: 1, lastActivity: '2024-01-19T14:20:00Z', status: 'active' },
    { id: '3', name: 'Pedro Costa', phone: '+5511966666666', email: 'pedro@example.com', lastInterest: 'Cartier Santos', messages: 15, verifications: 3, lastActivity: '2024-01-18T10:15:00Z', status: 'active' },
    { id: '4', name: 'Ana Lima', phone: '+5511955555555', email: 'ana@example.com', lastInterest: 'Patek Philippe', messages: 5, verifications: 1, lastActivity: '2024-01-17T16:45:00Z', status: 'active' },
    { id: '5', name: 'Carlos Mendes', phone: '+5511944444444', email: 'carlos@example.com', lastInterest: 'Rolex GMT-Master', messages: 20, verifications: 4, lastActivity: '2024-01-15T11:30:00Z', status: 'active' },
    { id: '6', name: 'Juliana Souza', phone: '+5511933333333', email: 'juliana@example.com', lastInterest: 'IWC Pilot', messages: 3, verifications: 0, lastActivity: '2024-01-10T13:20:00Z', status: 'inactive' },
    { id: '7', name: 'Roberto Alves', phone: '+5511922222222', email: 'roberto@example.com', lastInterest: 'Audemars Piguet', messages: 25, verifications: 5, lastActivity: '2024-01-08T09:10:00Z', status: 'inactive' },
    { id: '8', name: 'Fernanda Lima', phone: '+5511911111111', email: 'fernanda@example.com', lastInterest: 'Omega Speedmaster', messages: 10, verifications: 2, lastActivity: '2024-01-05T15:00:00Z', status: 'inactive' },
  ])

  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
    minMessages: 0,
    minVerifications: 0
  })

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (filter.status !== 'all' && c.status !== filter.status) return false
    if (filter.search && !c.name.toLowerCase().includes(filter.search.toLowerCase()) && !c.phone.includes(filter.search)) return false
    if (c.messages < filter.minMessages) return false
    if (c.verifications < filter.minVerifications) return false
    return true
  })

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    totalMessages: customers.reduce((sum, c) => sum + c.messages, 0),
    totalVerifications: customers.reduce((sum, c) => sum + c.verifications, 0)
  }

  function getStatusBadge(status: string) {
    if (status === 'active') {
      return <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-green-500/10 text-green-400 border-green-500/20">Ativo</span>
    }
    return <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Inativo</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Clientes</h1>
        <p className="text-zinc-400 mt-2">{customers.length} clientes cadastrados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Ativos</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total Mensagens</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalMessages}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total Verificações</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalVerifications}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome ou telefone..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {/* Min Messages */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Min. Mensagens: {filter.minMessages}
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={filter.minMessages}
              onChange={(e) => setFilter({ ...filter, minMessages: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Min Verifications */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Min. Verificações: {filter.minVerifications}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={filter.minVerifications}
              onChange={(e) => setFilter({ ...filter, minVerifications: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Último Interesse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Mensagens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Verificações
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Última Atividade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-400">{customer.phone}</div>
                    <div className="text-xs text-zinc-500">{customer.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-300">{customer.lastInterest}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{customer.messages}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{customer.verifications}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-zinc-400">{formatDateRelative(customer.lastActivity)}</div>
                    <div className="text-xs text-zinc-500">{formatDate(customer.lastActivity)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(customer.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-400 hover:text-blue-300 mr-3">Ver Detalhes</button>
                    <button className="text-zinc-400 hover:text-zinc-300">Exportar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Mostrando {filteredCustomers.length} de {customers.length} clientes
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
          Exportar CSV
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Adicionar Cliente
        </button>
      </div>
    </div>
  )
}
