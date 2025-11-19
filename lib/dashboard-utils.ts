/**
 * Dashboard Utilities
 * Helper functions for dashboard components
 */

export function getICDColor(icd: number): string {
  if (icd >= 90) return 'text-green-600 bg-green-50'
  if (icd >= 70) return 'text-yellow-600 bg-yellow-50'
  if (icd >= 41) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

export function getICDBadge(icd: number): string {
  if (icd >= 90) return '✅ Consistente (validado)'
  if (icd >= 70) return '⚠️ Consistente (sem validação)'
  if (icd >= 41) return '⚠️ Inconclusivo'
  return '❌ Inconsistente'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-gray-600 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    approved: 'text-green-700 bg-green-100',
    manual_review: 'text-yellow-600 bg-yellow-50',
    rejected: 'text-red-600 bg-red-50',
  }
  return colors[status] || 'text-gray-600 bg-gray-100'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatDateRelative(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins === 1) return 'há 1 minuto'
  if (diffMins < 60) return `há ${diffMins} minutos`
  if (diffHours === 1) return 'há 1 hora'
  if (diffHours < 24) return `há ${diffHours} horas`
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  return formatDate(date)
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || null
    })

    data.push(row)
  }

  return data
}
