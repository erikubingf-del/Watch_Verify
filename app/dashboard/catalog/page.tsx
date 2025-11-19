'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MOCK_CATALOG } from '@/lib/mock-catalog'
import { formatCurrency } from '@/lib/dashboard-utils'

export default function CatalogPage() {
  const [products] = useState(MOCK_CATALOG)
  const [filter, setFilter] = useState({
    category: 'all',
    search: '',
    embeddingStatus: 'all'
  })

  // Filter products
  const filteredProducts = products.filter(product => {
    if (filter.category !== 'all' && product.category !== filter.category) return false
    if (filter.search && !product.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    // Mock embedding status - in production would check actual embedding field
    return true
  })

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  function getEmbeddingStatus(productId: string) {
    // Mock status - in production would check actual embedding field
    const statuses = ['synced', 'pending', 'missing']
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    const badges = {
      synced: { label: '✅ Synced', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      pending: { label: '⏳ Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      missing: { label: '❌ Missing', color: 'bg-red-500/10 text-red-400 border-red-500/20' }
    }

    return badges[status as keyof typeof badges]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Catálogo</h1>
          <p className="text-zinc-400 mt-2">{products.length} produtos no catálogo</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            🔄 Sincronizar Embeddings
          </button>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
            📥 Importar CSV
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            ➕ Adicionar Produto
          </button>
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
              placeholder="Buscar por título..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Categoria</label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Embedding Status */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Status Embedding</label>
            <select
              value={filter.embeddingStatus}
              onChange={(e) => setFilter({ ...filter, embeddingStatus: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
              <option value="missing">Missing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Embedding
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
              {filteredProducts.map((product) => {
                const embeddingStatus = getEmbeddingStatus(product.id)
                return (
                  <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{product.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 max-w-md truncate">
                        {product.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-zinc-300 capitalize">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-zinc-500">
                            +{product.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${embeddingStatus.color}`}>
                        {embeddingStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${product.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-400 hover:text-blue-300 mr-3">Editar</button>
                      <button className="text-red-400 hover:text-red-300">Deletar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Mostrando {filteredProducts.length} de {products.length} produtos
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors">
              Anterior
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
              1
            </button>
            <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors">
              2
            </button>
            <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total Produtos</div>
          <div className="text-2xl font-bold text-white mt-1">{products.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Embeddings Synced</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {Math.floor(products.length * 0.65)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Pendentes</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">
            {Math.floor(products.length * 0.25)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Preço Médio</div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length)}
          </div>
        </div>
      </div>
    </div>
  )
}
