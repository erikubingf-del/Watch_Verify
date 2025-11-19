export default function AnalyticsPage() {
  // Mock analytics data
  const metrics = {
    totalVerifications: 124,
    thisMonth: 45,
    lastMonth: 38,
    growth: '+18%',
    avgICD: 87.3,
    approvalRate: 75,
    manualReviewRate: 20,
    rejectionRate: 5,
    avgProcessingTime: '12 min',
    totalCatalog: 47,
    withEmbeddings: 31,
    searchAccuracy: 92,
    apiResponseTime: '265 ms'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-400 mt-2">Métricas e insights do sistema</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">Verificações (mês)</div>
            <span className="text-green-400 text-sm font-medium">{metrics.growth}</span>
          </div>
          <div className="text-3xl font-bold text-white">{metrics.thisMonth}</div>
          <div className="text-xs text-zinc-500 mt-2">vs {metrics.lastMonth} mês anterior</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-sm text-zinc-400 mb-4">ICD Médio</div>
          <div className="text-3xl font-bold text-green-400">{metrics.avgICD}</div>
          <div className="text-xs text-zinc-500 mt-2">Consistência alta</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-sm text-zinc-400 mb-4">Taxa de Aprovação</div>
          <div className="text-3xl font-bold text-white">{metrics.approvalRate}%</div>
          <div className="text-xs text-zinc-500 mt-2">{metrics.manualReviewRate}% revisão manual</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-sm text-zinc-400 mb-4">Tempo Médio</div>
          <div className="text-3xl font-bold text-white">{metrics.avgProcessingTime}</div>
          <div className="text-xs text-zinc-500 mt-2">Processamento</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verifications Over Time */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verificações (últimos 30 dias)</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {[12, 8, 15, 9, 14, 18, 11, 16, 13, 19, 14, 17, 15, 12, 10, 14, 18, 16, 13, 15, 17, 14, 19, 16, 18, 15, 14, 16, 19, 17].map((value, i) => (
              <div key={i} className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 transition-colors rounded-t" style={{ height: `${value * 4}%` }} title={`Dia ${i + 1}: ${value} verificações`} />
            ))}
          </div>
          <div className="mt-4 text-xs text-zinc-500 flex justify-between">
            <span>1º dia</span>
            <span>15º dia</span>
            <span>30º dia</span>
          </div>
        </div>

        {/* ICD Score Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribuição ICD Score</h2>
          <div className="space-y-4 mt-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">90-100 (Consistente)</span>
                <span className="text-sm font-medium text-green-400">45%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">70-89 (Aprovado)</span>
                <span className="text-sm font-medium text-yellow-400">35%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">41-69 (Inconclusivo)</span>
                <span className="text-sm font-medium text-orange-400">15%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">0-40 (Rejeitado)</span>
                <span className="text-sm font-medium text-red-400">5%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Brands */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Marcas Mais Verificadas</h2>
          <div className="space-y-3">
            {[
              { brand: 'Rolex', count: 52, percentage: 42 },
              { brand: 'Omega', count: 22, percentage: 18 },
              { brand: 'Cartier', count: 15, percentage: 12 },
              { brand: 'Patek Philippe', count: 10, percentage: 8 },
              { brand: 'Outros', count: 25, percentage: 20 }
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">{item.brand}</span>
                  <span className="text-sm font-medium text-white">{item.count}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Performance do Sistema</h2>
          <div className="space-y-6 mt-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Catálogo com Embeddings</span>
                <span className="text-sm font-medium text-green-400">{Math.round(metrics.withEmbeddings / metrics.totalCatalog * 100)}%</span>
              </div>
              <div className="text-xs text-zinc-500">{metrics.withEmbeddings} de {metrics.totalCatalog} produtos</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Precisão de Busca</span>
                <span className="text-sm font-medium text-green-400">{metrics.searchAccuracy}%</span>
              </div>
              <div className="text-xs text-zinc-500">Relevância semântica</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Tempo de Resposta API</span>
                <span className="text-sm font-medium text-white">{metrics.apiResponseTime}</span>
              </div>
              <div className="text-xs text-zinc-500">Média últimos 7 dias</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Uptime</span>
                <span className="text-sm font-medium text-green-400">99.8%</span>
              </div>
              <div className="text-xs text-zinc-500">Últimos 30 dias</div>
            </div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
          📊 Exportar Relatório
        </button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          📈 Gerar PDF
        </button>
      </div>
    </div>
  )
}
