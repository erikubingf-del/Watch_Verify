'use client'

import { useState, useEffect } from 'react'

// Types
interface Product {
  id: string
  title: string
  brand: string
  description: string
  price: number
  category: string
  image_url?: string
  stock_quantity?: number
  tags: string[]
  active: boolean
  has_embedding: boolean
  embedding_status?: 'synced' | 'pending' | 'missing'
  created_at: string
}

export default function CatalogManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [csvFile, setCSVFile] = useState<File | null>(null)
  const [csvPreview, setCSVPreview] = useState<any[]>([])
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false)

  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    embeddingStatus: 'all',
    activeOnly: false
  })

  const [productForm, setProductForm] = useState({
    title: '',
    brand: '',
    description: '',
    price: 0,
    category: '',
    image_url: '',
    stock_quantity: 0,
    tags: '',
    active: true
  })

  // Fetch products
  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const res = await fetch('/api/dashboard/catalog')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    if (filters.category !== 'all' && p.category !== filters.category) return false
    if (filters.search &&
        !p.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !p.brand.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.embeddingStatus !== 'all' && p.embedding_status !== filters.embeddingStatus) return false
    if (filters.activeOnly && !p.active) return false
    return true
  })

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  // Stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    synced: products.filter(p => p.embedding_status === 'synced').length,
    pending: products.filter(p => p.embedding_status === 'pending').length,
    missing: products.filter(p => p.embedding_status === 'missing' || !p.has_embedding).length,
    avgPrice: products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0
  }

  function openProductModal(product?: Product) {
    if (product) {
      setSelectedProduct(product)
      setProductForm({
        title: product.title,
        brand: product.brand,
        description: product.description,
        price: product.price,
        category: product.category,
        image_url: product.image_url || '',
        stock_quantity: product.stock_quantity || 0,
        tags: product.tags.join(', '),
        active: product.active
      })
    } else {
      setSelectedProduct(null)
      setProductForm({
        title: '',
        brand: '',
        description: '',
        price: 0,
        category: '',
        image_url: '',
        stock_quantity: 0,
        tags: '',
        active: true
      })
    }
    setShowProductModal(true)
  }

  async function saveProduct() {
    try {
      const tagsArray = productForm.tags.split(',').map(t => t.trim()).filter(t => t)

      const productData = {
        ...productForm,
        tags: tagsArray,
        price: Number(productForm.price),
        stock_quantity: Number(productForm.stock_quantity)
      }

      const url = selectedProduct
        ? `/api/dashboard/catalog/${selectedProduct.id}`
        : '/api/dashboard/catalog'

      const method = selectedProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (res.ok) {
        await loadProducts()
        setShowProductModal(false)
        setSelectedProduct(null)
      } else {
        alert('Erro ao salvar produto')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Erro ao salvar produto')
    }
  }

  async function deleteProduct(productId: string) {
    try {
      const res = await fetch(`/api/dashboard/catalog/${productId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadProducts()
        setShowDeleteConfirm(null)
      } else {
        alert('Erro ao deletar produto')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Erro ao deletar produto')
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCSVFile(file)

    // Parse CSV preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',')

      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',')
        const obj: any = {}
        headers.forEach((header, i) => {
          obj[header.trim()] = values[i]?.trim() || ''
        })
        return obj
      })

      setCSVPreview(preview)
    }
    reader.readAsText(file)
  }

  async function uploadCSV() {
    if (!csvFile) return

    const formData = new FormData()
    formData.append('file', csvFile)

    try {
      const res = await fetch('/api/dashboard/catalog/upload-csv', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        alert(`${data.imported} produtos importados com sucesso!`)
        await loadProducts()
        setShowCSVModal(false)
        setCSVFile(null)
        setCSVPreview([])
      } else {
        alert('Erro ao importar CSV')
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Erro ao importar CSV')
    }
  }

  async function generateEmbeddings() {
    setGeneratingEmbeddings(true)
    try {
      const res = await fetch('/api/dashboard/catalog/generate-embeddings', {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        alert(`${data.generated} embeddings gerados com sucesso!`)
        await loadProducts()
      } else {
        alert('Erro ao gerar embeddings')
      }
    } catch (error) {
      console.error('Error generating embeddings:', error)
      alert('Erro ao gerar embeddings')
    } finally {
      setGeneratingEmbeddings(false)
    }
  }

  function downloadCSVTemplate() {
    const template = `title,brand,description,price,category,image_url,stock_quantity,tags
Rolex Submariner Date,Rolex,Relógio de mergulho icônico com data,85000,watches,https://example.com/submariner.jpg,5,"rolex, submariner, diving, luxury"
Omega Seamaster 300M,Omega,Relógio de mergulho profissional,45000,watches,https://example.com/seamaster.jpg,3,"omega, seamaster, diving, james bond"`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'catalog_template.csv'
    link.click()
  }

  function getEmbeddingBadge(status?: string) {
    const badges = {
      synced: { label: '✅ Synced', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      pending: { label: '⏳ Pendente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      missing: { label: '❌ Ausente', color: 'bg-red-500/10 text-red-400 border-red-500/20' }
    }
    return badges[status as keyof typeof badges] || badges.missing
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-zinc-400 mt-4">Carregando catálogo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gerenciamento de Catálogo</h1>
          <p className="text-zinc-400 mt-2">{products.length} produtos cadastrados</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateEmbeddings}
            disabled={generatingEmbeddings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {generatingEmbeddings ? '⏳ Gerando...' : '🔄 Gerar Embeddings'}
          </button>
          <button
            onClick={() => setShowCSVModal(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            📥 Importar CSV
          </button>
          <button
            onClick={() => openProductModal()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            ➕ Novo Produto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Ativos</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">✅ Synced</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.synced}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">⏳ Pendentes</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">❌ Ausentes</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.missing}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400">Preço Médio</div>
          <div className="text-2xl font-bold text-white mt-1">
            R$ {stats.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Título ou marca..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Categoria</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Embedding Status</label>
            <select
              value={filters.embeddingStatus}
              onChange={(e) => setFilters({ ...filters, embeddingStatus: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="synced">Synced</option>
              <option value="pending">Pendente</option>
              <option value="missing">Ausente</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-300">Apenas Ativos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500">Nenhum produto encontrado</p>
            <p className="text-sm text-zinc-600 mt-2">
              {filters.search || filters.category !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Comece adicionando produtos ao catálogo'}
            </p>
          </div>
        ) : (
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
                    Estoque
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-12 h-12 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-white">{product.title}</div>
                          <div className="text-xs text-zinc-500">{product.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-zinc-300">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">
                        R$ {product.price.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${(product.stock_quantity || 0) < 5 ? 'text-red-400 font-medium' : 'text-zinc-300'}`}>
                        {product.stock_quantity || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const badge = getEmbeddingBadge(product.embedding_status)
                        return (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
                        product.active
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openProductModal(product)}
                        className="text-blue-400 hover:text-blue-300 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(product.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-800">
            <div className="text-sm text-zinc-400">
              Mostrando {filteredProducts.length} de {products.length} produtos
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900">
              <h2 className="text-2xl font-bold text-white">
                {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Título *</label>
                  <input
                    type="text"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Marca *</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descrição *</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Categoria *</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="watches, jewelry, etc"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">URL da Imagem</label>
                  <input
                    type="text"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Estoque</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={productForm.tags}
                  onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                  placeholder="rolex, submariner, diving"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.active}
                  onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-zinc-300">Produto Ativo</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProduct}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {selectedProduct ? 'Atualizar' : 'Criar'} Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900">
              <h2 className="text-2xl font-bold text-white">Importar Produtos via CSV</h2>
              <button
                onClick={() => {
                  setShowCSVModal(false)
                  setCSVFile(null)
                  setCSVPreview([])
                }}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400 mb-2">📋 Formato do CSV</p>
                <p className="text-xs text-zinc-400 mb-3">
                  Cabeçalhos: title, brand, description, price, category, image_url, stock_quantity, tags
                </p>
                <button
                  onClick={downloadCSVTemplate}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Baixar Template CSV
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Selecionar Arquivo CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              {csvPreview.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Pré-visualização (primeiras 5 linhas)</h3>
                  <div className="bg-zinc-800 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          {Object.keys(csvPreview[0]).map(key => (
                            <th key={key} className="text-left py-2 px-3 text-zinc-400">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, idx) => (
                          <tr key={idx} className="border-b border-zinc-700/50">
                            {Object.values(row).map((val: any, i) => (
                              <td key={i} className="py-2 px-3 text-zinc-300">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setShowCSVModal(false)
                    setCSVFile(null)
                    setCSVPreview([])
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={uploadCSV}
                  disabled={!csvFile}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Importar Produtos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Confirmar Exclusão</h2>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja deletar este produto? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteProduct(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
