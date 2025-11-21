'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface Verification {
  id: string
  customer: string
  phone: string
  cpf?: string
  brand: string
  model: string
  reference: string
  serial: string
  icd: number
  status: 'approved' | 'manual_review' | 'rejected' | 'pending'
  legal_risk_category?: string
  legal_risk_label?: string
  legal_risk_color?: 'green' | 'yellow' | 'orange' | 'red'
  critical_issues?: string[]
  warnings?: string[]
  date: string
  photo_url?: string
  guarantee_url?: string
  invoice_url?: string
  notes?: string
}

export default function VerificationDashboardPage() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null)
  const [cpfPassword, setCpfPassword] = useState('')
  const [showCpfModal, setShowCpfModal] = useState(false)
  const [revealedCpf, setRevealedCpf] = useState<string | null>(null)
  const [cpfTimeout, setCpfTimeout] = useState<NodeJS.Timeout | null>(null)

  const [filters, setFilters] = useState({
    status: 'all',
    brand: 'all',
    riskLevel: 'all',
    search: ''
  })

  // Fetch verifications
  useEffect(() => {
    async function loadVerifications() {
      try {
        const res = await fetch('/api/dashboard/verifications')
        if (res.ok) {
          const data = await res.json()
          setVerifications(data.verifications || [])
        }
      } catch (error) {
        console.error('Error loading verifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVerifications()
  }, [])

  // Auto-hide CPF after 10 seconds
  function revealCpf(cpf: string) {
    if (cpfTimeout) clearTimeout(cpfTimeout)

    setRevealedCpf(cpf)
    const timeout = setTimeout(() => {
      setRevealedCpf(null)
    }, 10000) // 10 seconds
    setCpfTimeout(timeout)
  }

  function handleCpfPasswordSubmit(verification: Verification) {
    // In production, validate password against user's credentials
    if (cpfPassword === 'admin' || cpfPassword.length > 0) {
      if (verification.cpf) {
        revealCpf(verification.cpf)
      }
      setShowCpfModal(false)
      setCpfPassword('')
    } else {
      alert('Senha incorreta')
    }
  }

  function maskCpf(cpf: string): string {
    if (!cpf || cpf.length < 11) return '***.***.***-**'
    return `***.***.${cpf.slice(-5, -2)}-${cpf.slice(-2)}`
  }

  // Filter verifications
  const filteredVerifications = verifications.filter(v => {
    if (filters.status !== 'all' && v.status !== filters.status) return false
    if (filters.brand !== 'all' && v.brand !== filters.brand) return false
    if (filters.riskLevel !== 'all') {
      if (filters.riskLevel === 'high' && v.legal_risk_color !== 'red') return false
      if (filters.riskLevel === 'medium' && v.legal_risk_color !== 'orange' && v.legal_risk_color !== 'yellow') return false
      if (filters.riskLevel === 'low' && v.legal_risk_color !== 'green') return false
    }
    if (filters.search &&
        !v.customer.toLowerCase().includes(filters.search.toLowerCase()) &&
        !v.brand.toLowerCase().includes(filters.search.toLowerCase()) &&
        !v.model.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const brands = ['all', ...Array.from(new Set(verifications.map(v => v.brand)))]

  // Stats
  const stats = {
    total: verifications.length,
    highConfidence: verifications.filter(v => v.icd > 85).length,
    mediumConfidence: verifications.filter(v => v.icd >= 70 && v.icd <= 85).length,
    reviewRequired: verifications.filter(v => v.icd >= 50 && v.icd < 70).length,
    highRisk: verifications.filter(v => v.icd < 50).length,
  }

  function getICDColor(icd: number): string {
    if (icd > 85) return 'text-green-400'
    if (icd >= 70) return 'text-yellow-400'
    if (icd >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  function getICDLabel(icd: number): string {
    if (icd > 85) return '🟢 Alta Confiança'
    if (icd >= 70) return '🟡 Média Confiança'
    if (icd >= 50) return '🟠 Requer Revisão'
    return '🔴 Alto Risco'
  }

  function getLegalRiskBadge(verification: Verification) {
    if (!verification.legal_risk_label) return null

    const colorClasses = {
      green: 'bg-green-500/10 text-green-400 border-green-500/20',
      yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
    }

    const colorClass = colorClasses[verification.legal_risk_color || 'green']

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${colorClass}`}>
        {verification.legal_risk_label}
      </span>
    )
  }

  function getStatusBadge(status: string) {
    const badges = {
      approved: { label: 'Aprovado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      manual_review: { label: 'Revisão Manual', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
      pending: { label: 'Pendente', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-zinc-400 mt-4">Carregando verificações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Verificações de Relógios</h1>
        <p className="text-zinc-400 mt-2">Autenticação e análise de risco legal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">🟢 Alta Confiança</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.highConfidence}</div>
          <div className="text-xs text-zinc-500 mt-1">ICD {'>'} 85</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">🟡 Média</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.mediumConfidence}</div>
          <div className="text-xs text-zinc-500 mt-1">ICD 70-85</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">🟠 Revisão</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">{stats.reviewRequired}</div>
          <div className="text-xs text-zinc-500 mt-1">ICD 50-70</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">🔴 Alto Risco</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.highRisk}</div>
          <div className="text-xs text-zinc-500 mt-1">ICD {'<'} 50</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Cliente, marca ou modelo..."
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
              <option value="approved">Aprovado</option>
              <option value="manual_review">Revisão Manual</option>
              <option value="rejected">Rejeitado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Marca</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {brands.map(brand => (
                <option key={brand} value={brand}>
                  {brand === 'all' ? 'Todas' : brand}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Nível de Risco</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="low">Baixo Risco</option>
              <option value="medium">Médio Risco</option>
              <option value="high">Alto Risco</option>
            </select>
          </div>
        </div>
      </div>

      {/* Verifications Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {filteredVerifications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500">Nenhuma verificação encontrada</p>
            <p className="text-sm text-zinc-600 mt-2">
              {filters.search || filters.status !== 'all' || filters.brand !== 'all' || filters.riskLevel !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Quando clientes solicitarem verificações via WhatsApp, elas aparecerão aqui'}
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
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Relógio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    ICD Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Risco Legal
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
                  <tr
                    key={verification.id}
                    className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedVerification(verification)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{verification.customer}</div>
                      <div className="text-xs text-zinc-500">{verification.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      {verification.cpf ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">
                            {revealedCpf && revealedCpf === verification.cpf
                              ? verification.cpf
                              : maskCpf(verification.cpf)}
                          </span>
                          {(!revealedCpf || revealedCpf !== verification.cpf) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedVerification(verification)
                                setShowCpfModal(true)
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              👁️ Exibir
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{verification.brand}</div>
                      <div className="text-xs text-zinc-400">{verification.model}</div>
                      <div className="text-xs text-zinc-600 font-mono mt-0.5">{verification.reference}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-bold ${getICDColor(verification.icd)}`}>
                          {verification.icd}/100
                        </span>
                        <span className="text-xs text-zinc-500">{getICDLabel(verification.icd)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getLegalRiskBadge(verification)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(verification.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {new Date(verification.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedVerification(verification)
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Ver Relatório
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredVerifications.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Mostrando {filteredVerifications.length} de {verifications.length} verificações
            </div>
          </div>
        )}
      </div>

      {/* CPF Password Modal */}
      {showCpfModal && selectedVerification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Autorização Necessária</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Para visualizar o CPF completo, insira sua senha de administrador:
            </p>
            <input
              type="password"
              value={cpfPassword}
              onChange={(e) => setCpfPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCpfPasswordSubmit(selectedVerification)}
              placeholder="Senha"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="text-xs text-zinc-500 mb-4">
              ⚠️ O CPF será exibido por 10 segundos e depois ocultado automaticamente (LGPD).
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCpfModal(false)
                  setCpfPassword('')
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCpfPasswordSubmit(selectedVerification)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Detail Modal */}
      {selectedVerification && !showCpfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
              <div>
                <h2 className="text-2xl font-bold text-white">Relatório de Verificação</h2>
                <p className="text-sm text-zinc-400 mt-1">{selectedVerification.brand} {selectedVerification.model}</p>
              </div>
              <button
                onClick={() => setSelectedVerification(null)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Cliente</h3>
                  <p className="text-white font-medium">{selectedVerification.customer}</p>
                  <p className="text-sm text-zinc-400 mt-1">{selectedVerification.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">Data de Submissão</h3>
                  <p className="text-white">
                    {new Date(selectedVerification.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Watch Details */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Detalhes do Relógio</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Marca</p>
                    <p className="text-white font-medium mt-1">{selectedVerification.brand}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Modelo</p>
                    <p className="text-white font-medium mt-1">{selectedVerification.model}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Referência</p>
                    <p className="text-white font-mono mt-1">{selectedVerification.reference}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Número de Série</p>
                    <p className="text-white font-mono mt-1">{selectedVerification.serial}</p>
                  </div>
                </div>
              </div>

              {/* ICD Score */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Índice de Consistência Documental (ICD)</h3>
                <div className="bg-zinc-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-5xl font-bold ${getICDColor(selectedVerification.icd)}`}>
                      {selectedVerification.icd}
                    </span>
                    <span className="text-2xl">/100</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        selectedVerification.icd > 85 ? 'bg-green-500' :
                        selectedVerification.icd >= 70 ? 'bg-yellow-500' :
                        selectedVerification.icd >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedVerification.icd}%` }}
                    />
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{getICDLabel(selectedVerification.icd)}</p>
                </div>
              </div>

              {/* Legal Risk Assessment */}
              {selectedVerification.legal_risk_label && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Avaliação de Risco Legal</h3>
                  <div className={`rounded-lg p-6 border ${
                    selectedVerification.legal_risk_color === 'green' ? 'bg-green-500/10 border-green-500/20' :
                    selectedVerification.legal_risk_color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20' :
                    selectedVerification.legal_risk_color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
                    'bg-red-500/10 border-red-500/20'
                  }`}>
                    <p className={`text-lg font-bold mb-2 ${
                      selectedVerification.legal_risk_color === 'green' ? 'text-green-400' :
                      selectedVerification.legal_risk_color === 'yellow' ? 'text-yellow-400' :
                      selectedVerification.legal_risk_color === 'orange' ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {selectedVerification.legal_risk_label}
                    </p>

                    {selectedVerification.critical_issues && selectedVerification.critical_issues.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-white mb-2">Problemas Críticos:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedVerification.critical_issues.map((issue, idx) => (
                            <li key={idx} className="text-sm text-red-300">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedVerification.warnings && selectedVerification.warnings.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-white mb-2">Avisos:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedVerification.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm text-yellow-300">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Full Report */}
              {selectedVerification.notes && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Relatório Completo</h3>
                  <div className="bg-zinc-800 rounded-lg p-6 prose prose-invert max-w-none">
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">
                      {selectedVerification.notes}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <a
                  href={`https://wa.me/${selectedVerification.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-center transition-colors"
                >
                  Enviar WhatsApp
                </a>
                <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Marcar como Revisado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
