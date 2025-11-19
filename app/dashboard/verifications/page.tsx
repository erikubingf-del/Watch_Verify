'use client'

import { useState } from 'react'
import { getICDColor, getICDBadge, formatDate } from '@/lib/dashboard-utils'

export default function VerificationsPage() {
  // Mock verification data - in production would fetch from Airtable
  const [verifications] = useState([
    { id: '1', customer: 'João Silva', phone: '+5511988888888', brand: 'Rolex', model: 'Submariner Date', reference: '116610LN', serial: 'A1234567', icd: 92, status: 'approved', date: '2024-01-20T15:30:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '2', customer: 'Maria Santos', phone: '+5511977777777', brand: 'Omega', model: 'Seamaster 300M', reference: '210.30.42.20.01.001', serial: 'B9876543', icd: 78, status: 'approved', date: '2024-01-19T14:20:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '3', customer: 'Pedro Costa', phone: '+5511966666666', brand: 'Cartier', model: 'Santos Medium', reference: 'WSSA0009', serial: 'C5555555', icd: 65, status: 'manual_review', date: '2024-01-19T10:15:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '4', customer: 'Ana Lima', phone: '+5511955555555', brand: 'Patek Philippe', model: 'Calatrava', reference: '5196G', serial: 'D4444444', icd: 95, status: 'approved', date: '2024-01-18T16:45:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '5', customer: 'Carlos Mendes', phone: '+5511944444444', brand: 'Rolex', model: 'GMT-Master II', reference: '116710LN', serial: 'E3333333', icd: 42, status: 'rejected', date: '2024-01-18T11:30:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '6', customer: 'Juliana Souza', phone: '+5511933333333', brand: 'IWC', model: 'Pilot Mark XVIII', reference: 'IW327001', serial: 'F2222222', icd: 88, status: 'approved', date: '2024-01-17T13:20:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '7', customer: 'Roberto Alves', phone: '+5511922222222', brand: 'Audemars Piguet', model: 'Royal Oak', reference: '15400ST', serial: 'G1111111', icd: 72, status: 'approved', date: '2024-01-17T09:10:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
    { id: '8', customer: 'Fernanda Lima', phone: '+5511911111111', brand: 'Omega', model: 'Speedmaster Moonwatch', reference: '310.30.42.50.01.001', serial: 'H9999999', icd: 55, status: 'manual_review', date: '2024-01-16T15:00:00Z', photo_url: '', guarantee_url: '', invoice_url: '' },
  ])

  const [filter, setFilter] = useState({
    status: 'all',
    brand: 'all',
    minICD: 0,
    maxICD: 100,
    search: ''
  })

  // Filter verifications
  const filteredVerifications = verifications.filter(v => {
    if (filter.status !== 'all' && v.status !== filter.status) return false
    if (filter.brand !== 'all' && v.brand !== filter.brand) return false
    if (v.icd < filter.minICD || v.icd > filter.maxICD) return false
    if (filter.search && !v.customer.toLowerCase().includes(filter.search.toLowerCase()) && !v.phone.includes(filter.search)) return false
    return true
  })

  const brands = ['all', ...Array.from(new Set(verifications.map(v => v.brand)))]

  function getStatusBadge(status: string) {
    const badges: Record<string, { label: string; color: string }> = {
      approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      manual_review: { label: 'Revisão Manual', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      pending: { label: 'Pendente', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      in_progress: { label: 'Em Progresso', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  // Calculate stats
  const stats = {
    total: verifications.length,
    approved: verifications.filter(v => v.status === 'approved').length,
    manualReview: verifications.filter(v => v.status === 'manual_review').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
    avgICD: Math.round(verifications.reduce((sum, v) => sum + v.icd, 0) / verifications.length * 10) / 10
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Verificações</h1>
        <p className="text-zinc-400 mt-2">{verifications.length} verificações processadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Aprovadas</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Revisão Manual</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.manualReview}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Rejeitadas</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.rejected}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">ICD Médio</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.avgICD}</div>
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
              placeholder="Cliente ou telefone..."
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
              <option value="approved">Aprovado</option>
              <option value="manual_review">Revisão Manual</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Marca</label>
            <select
              value={filter.brand}
              onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {brands.map(brand => (
                <option key={brand} value={brand}>
                  {brand === 'all' ? 'Todas' : brand}
                </option>
              ))}
            </select>
          </div>

          {/* ICD Range */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              ICD Score: {filter.minICD} - {filter.maxICD}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filter.minICD}
                onChange={(e) => setFilter({ ...filter, minICD: parseInt(e.target.value) })}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filter.maxICD}
                onChange={(e) => setFilter({ ...filter, maxICD: parseInt(e.target.value) })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Verifications Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
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
                  Serial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  ICD Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredVerifications.map((verification) => (
                <tr key={verification.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{verification.customer}</div>
                    <div className="text-xs text-zinc-500">{verification.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">{verification.brand}</div>
                    <div className="text-xs text-zinc-400">{verification.model}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono text-zinc-400">{verification.serial}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm font-bold ${getICDColor(verification.icd)}`}>
                        {verification.icd}/100
                      </span>
                      <span className="text-xs text-zinc-500">{getICDBadge(verification.icd)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(verification.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                    {formatDate(verification.date)}
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
            Mostrando {filteredVerifications.length} de {verifications.length} verificações
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
    </div>
  )
}
