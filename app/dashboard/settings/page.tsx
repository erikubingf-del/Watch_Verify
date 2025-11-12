'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Tenant Settings
    storeName: 'Watch Verify',
    logoUrl: '/logo.png',
    primaryColor: '#3b82f6',
    welcomeMessage: 'Olá! Bem-vindo ao Watch Verify. Como posso ajudá-lo hoje?',
    businessHours: '9h-18h',

    // API Configuration
    openaiApiKey: 'sk-proj-***************',
    twilioAccountSid: 'AC***************',
    twilioAuthToken: '***************',
    twilioWhatsappNumber: '+14155238886',
    airtableApiKey: 'pat***************',
    airtableBaseId: 'app4cwmDJPeS604Bv',
    webhookUrl: 'https://watch-verify.com/api/webhook',

    // Features
    autoReply: true,
    ragEnabled: true,
    icdEnabled: true,
    embeddingsAutoSync: false,
    notificationsEnabled: true,

    // Thresholds
    icdApprovalThreshold: 70,
    icdManualReviewThreshold: 41,
    maxMessagesPerDay: 100,
    searchResultsLimit: 5,
  })

  const [activeTab, setActiveTab] = useState('tenant')

  function handleSave() {
    // In production, would save to database
    alert('Configurações salvas com sucesso!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Configurações</h1>
        <p className="text-zinc-400 mt-2">Gerencie as configurações do sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-6">
          {[
            { id: 'tenant', label: 'Tenant', icon: '🏢' },
            { id: 'api', label: 'API', icon: '🔑' },
            { id: 'features', label: 'Features', icon: '⚙️' },
            { id: 'thresholds', label: 'Thresholds', icon: '📊' },
            { id: 'users', label: 'Usuários', icon: '👥' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tenant Settings */}
      {activeTab === 'tenant' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Configurações do Tenant</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nome da Loja</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">URL do Logo</label>
              <input
                type="text"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Cor Primária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="h-10 w-20 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Horário de Atendimento</label>
              <input
                type="text"
                value={settings.businessHours}
                onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Mensagem de Boas-Vindas</label>
            <textarea
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* API Configuration */}
      {activeTab === 'api' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Configuração de APIs</h2>

          <div className="space-y-6">
            {/* OpenAI */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">OpenAI API Key</label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">Usado para embeddings e chat completion</p>
            </div>

            {/* Twilio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Twilio Account SID</label>
                <input
                  type="password"
                  value={settings.twilioAccountSid}
                  onChange={(e) => setSettings({ ...settings, twilioAccountSid: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Twilio Auth Token</label>
                <input
                  type="password"
                  value={settings.twilioAuthToken}
                  onChange={(e) => setSettings({ ...settings, twilioAuthToken: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Número WhatsApp (Twilio)</label>
              <input
                type="text"
                value={settings.twilioWhatsappNumber}
                onChange={(e) => setSettings({ ...settings, twilioWhatsappNumber: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Airtable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Airtable API Key</label>
                <input
                  type="password"
                  value={settings.airtableApiKey}
                  onChange={(e) => setSettings({ ...settings, airtableApiKey: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Airtable Base ID</label>
                <input
                  type="text"
                  value={settings.airtableBaseId}
                  onChange={(e) => setSettings({ ...settings, airtableBaseId: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            {/* Webhook */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Webhook URL</label>
              <input
                type="text"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">URL para receber webhooks do Twilio</p>
            </div>

            {/* Test Buttons */}
            <div className="flex gap-3 pt-4">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Testar OpenAI
              </button>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                Testar Twilio
              </button>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                Testar Airtable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      {activeTab === 'features' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Features do Sistema</h2>

          <div className="space-y-4">
            {[
              { key: 'autoReply', label: 'Auto-Reply Ativado', description: 'Responder automaticamente mensagens do WhatsApp' },
              { key: 'ragEnabled', label: 'RAG Memory Ativado', description: 'Usar busca semântica no catálogo' },
              { key: 'icdEnabled', label: 'ICD Verification Ativado', description: 'Calcular ICD score nas verificações' },
              { key: 'embeddingsAutoSync', label: 'Auto-Sync Embeddings', description: 'Sincronizar embeddings automaticamente ao adicionar produtos' },
              { key: 'notificationsEnabled', label: 'Notificações Ativadas', description: 'Enviar notificações por email sobre eventos importantes' },
            ].map(feature => (
              <div key={feature.key} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-white">{feature.label}</div>
                  <div className="text-xs text-zinc-400 mt-1">{feature.description}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[feature.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [feature.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Thresholds e Limites</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                ICD Approval Threshold: {settings.icdApprovalThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.icdApprovalThreshold}
                onChange={(e) => setSettings({ ...settings, icdApprovalThreshold: parseInt(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-zinc-500 mt-1">Scores acima deste valor são aprovados automaticamente</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                ICD Manual Review Threshold: {settings.icdManualReviewThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.icdManualReviewThreshold}
                onChange={(e) => setSettings({ ...settings, icdManualReviewThreshold: parseInt(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-zinc-500 mt-1">Scores entre este valor e approval threshold requerem revisão manual</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Max Messages Per Day: {settings.maxMessagesPerDay}
              </label>
              <input
                type="number"
                value={settings.maxMessagesPerDay}
                onChange={(e) => setSettings({ ...settings, maxMessagesPerDay: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Limite de mensagens por cliente por dia</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Search Results Limit: {settings.searchResultsLimit}
              </label>
              <input
                type="number"
                value={settings.searchResultsLimit}
                onChange={(e) => setSettings({ ...settings, searchResultsLimit: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Número máximo de resultados em buscas semânticas</p>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Usuários do Sistema</h2>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Adicionar Usuário
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Admin User', email: 'admin@watchverify.com', role: 'admin', status: 'active' },
              { name: 'Manager User', email: 'manager@watchverify.com', role: 'manager', status: 'active' },
              { name: 'Staff User', email: 'staff@watchverify.com', role: 'staff', status: 'inactive' },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{user.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 capitalize">{user.role}</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${
                    user.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">Editar</button>
                  <button className="text-red-400 hover:text-red-300 text-sm">Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
          Resetar
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
