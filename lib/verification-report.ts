/**
 * Verification Report Generator
 *
 * Creates comprehensive markdown reports for watch verification.
 */

import { EnhancedVerificationSession, maskCPF } from './enhanced-verification'
import {
  WatchPhotoAnalysis,
  GuaranteeCardAnalysis,
  InvoiceAnalysis,
  CrossReferenceResult,
} from './document-ocr'
import { calculateLegalRisk, type LegalRiskAssessment } from './legal-risk'

export interface VerificationReportData {
  session: EnhancedVerificationSession
  photoAnalysis: WatchPhotoAnalysis
  guaranteeAnalysis: GuaranteeCardAnalysis
  invoiceAnalysis: InvoiceAnalysis
  crossReference: CrossReferenceResult
  nfValidated?: boolean | null
  legalRisk?: LegalRiskAssessment // NEW: Legal risk assessment
}

/**
 * Generate comprehensive verification report in markdown
 */
export function generateVerificationReport(data: VerificationReportData): string {
  const {
    session,
    photoAnalysis,
    guaranteeAnalysis,
    invoiceAnalysis,
    crossReference,
    nfValidated,
    legalRisk,
  } = data

  const verificationId = session.id.substring(0, 8).toUpperCase()
  const timestamp = new Date(session.createdAt).toLocaleString('pt-BR')
  const maskedCPF = session.cpf ? maskCPF(session.cpf) : 'Não informado'

  // Determine brand and model
  const brand =
    photoAnalysis.brand || guaranteeAnalysis.brand || session.customerStatedModel?.split(' ')[0]
  const model =
    photoAnalysis.model ||
    guaranteeAnalysis.model ||
    session.customerStatedModel?.split(' ').slice(1).join(' ')

  // Document checklist
  const docs: string[] = []
  if (session.watchPhotoUrl) docs.push('✅ Foto do relógio')
  if (session.guaranteeCardUrl) docs.push('✅ Certificado de garantia')
  if (session.invoiceUrl) docs.push('✅ Nota Fiscal')
  if (session.additionalDocuments && session.additionalDocuments.length > 0) {
    docs.push(`✅ ${session.additionalDocuments.length} documento(s) adicional(is)`)
  }

  // Build report
  let report = `# RELATÓRIO DE VERIFICAÇÃO - ${brand} ${model}

**Cliente:** ${session.customerName} (CPF: ${maskedCPF})
**Data:** ${timestamp}
**ID Verificação:** #VER-${verificationId}

---

## 📸 DOCUMENTOS RECEBIDOS

${docs.join('\n')}

---

## 🔍 ANÁLISE TÉCNICA

**Marca:** ${brand || 'Não identificado'}
**Modelo:** ${model || 'Não identificado'}
**Referência:** ${photoAnalysis.reference_number || guaranteeAnalysis.reference_number || 'Não identificado'}
**Serial:** ${photoAnalysis.serial_number || guaranteeAnalysis.serial_number || 'Não identificado'}

`

  // Condition notes
  if (photoAnalysis.condition_notes) {
    report += `**Condição:** ${photoAnalysis.condition_notes}\n`
  }

  if (photoAnalysis.visible_damage && photoAnalysis.visible_damage.length > 0) {
    report += `**Danos Visíveis:** ${photoAnalysis.visible_damage.join(', ')}\n`
  }

  report += `\n---\n\n## ✅ CONSISTÊNCIA DE DADOS\n\n`

  // Cross-reference table
  report += `| Campo | Foto | Garantia | NF | Status |\n`
  report += `|-------|------|----------|--------|\n`

  report += `| Referência | ${photoAnalysis.reference_number || '-'} | ${guaranteeAnalysis.reference_number || '-'} | ${invoiceAnalysis.reference_number || '-'} | ${crossReference.reference_match ? '✅' : '❌'} |\n`

  report += `| Modelo | ${photoAnalysis.model || '-'} | ${guaranteeAnalysis.model || '-'} | - | ${crossReference.model_match ? '✅' : '⚠️'} |\n`

  report += `| Data Compra | - | ${guaranteeAnalysis.purchase_date || '-'} | ${invoiceAnalysis.invoice_date || '-'} | ${crossReference.date_match ? '✅' : '⚠️'} |\n`

  if (session.dateMismatchReason) {
    report += `\n**Explicação do cliente sobre diferença de datas:** ${session.dateMismatchReason}\n`
  }

  // Legal Risk Assessment (NEW)
  if (legalRisk) {
    report += `\n---\n\n## ⚖️ AVALIAÇÃO DE RISCO LEGAL\n\n`

    report += `**Categoria:** ${legalRisk.icon} **${legalRisk.label}**\n`
    report += `**Índice de Consistência Documental (ICD):** ${legalRisk.icd}/100\n`
    report += `**Nível de Risco:** ${legalRisk.color === 'green' ? '🟢 BAIXO' : legalRisk.color === 'yellow' ? '🟡 MÉDIO' : legalRisk.color === 'orange' ? '🟠 ALTO' : '🔴 CRÍTICO'}\n\n`

    report += `**Recomendação:**\n${legalRisk.recommendation}\n`

    if (legalRisk.criticalIssues.length > 0) {
      report += `\n**🚨 Problemas Críticos:**\n`
      legalRisk.criticalIssues.forEach((issue) => {
        report += `- ${issue}\n`
      })
    }

    if (legalRisk.warnings.length > 0) {
      report += `\n**⚠️ Atenção:**\n`
      legalRisk.warnings.forEach((warning) => {
        report += `- ${warning}\n`
      })
    }
  }

  // NF Validation section (Brazil only)
  if (invoiceAnalysis.invoice_number) {
    report += `\n---\n\n## 🇧🇷 VALIDAÇÃO NOTA FISCAL\n\n`
    report += `**Número NF:** ${invoiceAnalysis.invoice_number}\n`

    if (invoiceAnalysis.store_cnpj) {
      report += `**CNPJ Emissor:** ${invoiceAnalysis.store_cnpj}\n`
    }

    if (nfValidated === true) {
      report += `**Validação SEFAZ:** ✅ **AUTÊNTICA**\n`
      report += `**Status:** NF válida e verificada pelo sistema da Receita Federal\n`
    } else if (nfValidated === false) {
      report += `**Validação SEFAZ:** ❌ **NÃO VALIDADA**\n`
      report += `**Status:** NF não encontrada no sistema SEFAZ ou inválida\n`
    } else {
      report += `**Validação SEFAZ:** ⚠️ **NÃO DISPONÍVEL**\n`
      report += `**Status:** Validação online não disponível (compra internacional ou sistema indisponível)\n`
    }
  }

  // Observations
  report += `\n---\n\n## 📋 OBSERVAÇÕES\n\n`

  if (crossReference.passed_checks.length > 0) {
    crossReference.passed_checks.forEach((check) => {
      report += `- ${check}\n`
    })
  }

  if (guaranteeAnalysis.store_name) {
    report += `- Relógio adquirido em: ${guaranteeAnalysis.store_name}\n`
  }

  if (photoAnalysis.authenticity_markers && photoAnalysis.authenticity_markers.length > 0) {
    report += `- Marcadores de autenticidade identificados: ${photoAnalysis.authenticity_markers.join(', ')}\n`
  }

  // Alerts/Issues
  report += `\n---\n\n## ⚠️ ALERTAS\n\n`

  if (crossReference.issues.length === 0 && crossReference.warnings.length === 0) {
    report += `Nenhum alerta detectado.\n`
  } else {
    if (crossReference.issues.length > 0) {
      report += `**🚨 CRÍTICO:**\n`
      crossReference.issues.forEach((issue) => {
        report += `- ${issue}\n`
      })
    }

    if (crossReference.warnings.length > 0) {
      report += `\n**⚠️ ATENÇÃO:**\n`
      crossReference.warnings.forEach((warning) => {
        report += `- ${warning}\n`
      })
    }
  }

  // Recommendation
  report += `\n---\n\n## 💡 RECOMENDAÇÃO\n\n`

  if (crossReference.issues.length === 0) {
    report += `**APROVADO PARA AVALIAÇÃO PRESENCIAL**\n\n`
    report += `Sugerimos agendar visita do cliente para inspeção física do relógio.\n`
    report += `Documentação em ordem, alta confiabilidade.\n`
  } else {
    report += `**REQUER REVISÃO MANUAL**\n\n`
    report += `Identificamos inconsistências que requerem análise detalhada.\n`
    report += `Recomendamos verificação minuciosa antes de agendar avaliação presencial.\n`
  }

  // Legal disclaimer
  report += `\n---\n\n## ⚖️ AVISO LEGAL\n\n`
  report += `**IMPORTANTE:** Este relatório é uma análise preliminar de documentação.\n\n`
  report += `🔸 **Todos os relatórios são analisados mediante pagamento da taxa de verificação**\n`
  report += `🔸 **NENHUM valor ou avaliação é definitivo sem inspeção física por relojoeiro qualificado**\n`
  report += `🔸 **A autenticidade final e valor de mercado só podem ser determinados presencialmente**\n`
  report += `🔸 **Este relatório NÃO constitui garantia de compra ou proposta de valor**\n`
  report += `🔸 **Recomendamos fortemente avaliação presencial antes de qualquer transação**\n`

  // Document links
  report += `\n---\n\n**Documentos anexos:**\n`
  let docCount = 0

  if (session.watchPhotoUrl) {
    docCount++
    report += `- [Foto do relógio](${session.watchPhotoUrl})\n`
  }

  if (session.guaranteeCardUrl) {
    docCount++
    report += `- [Certificado de garantia](${session.guaranteeCardUrl})\n`
  }

  if (session.invoiceUrl) {
    docCount++
    report += `- [Nota Fiscal](${session.invoiceUrl})\n`
  }

  if (session.additionalDocuments && session.additionalDocuments.length > 0) {
    session.additionalDocuments.forEach((url, index) => {
      docCount++
      report += `- [Documento adicional ${index + 1}](${url})\n`
    })
  }

  report += `\n---\n\n`
  report += `_Gerado automaticamente pelo Watch Verify AI_\n`
  report += `_Este relatório é confidencial e destinado exclusivamente à boutique contratante_\n`

  return report
}

/**
 * Generate customer-facing summary (simplified, no sensitive details)
 */
export function generateCustomerSummary(
  session: EnhancedVerificationSession,
  verificationId: string
): string {
  return `✅ Verificação concluída!

Sua documentação foi analisada e enviada para a equipe da boutique.

⚠️ **Importante:** Este relatório é uma análise preliminar. Qualquer proposta de compra e valor só será definida após avaliação física do relógio por nossos especialistas.

Em breve entraremos em contato para agendar uma avaliação presencial.

Código de verificação: #VER-${verificationId}`
}

/**
 * Generate store owner notification (WhatsApp)
 */
export function generateStoreNotification(
  customerName: string,
  watchInfo: string,
  status: 'approved' | 'review' | 'rejected',
  verificationId: string,
  dashboardLink?: string
): string {
  const statusEmoji = status === 'approved' ? '✅' : status === 'review' ? '⚠️' : '❌'
  const statusText =
    status === 'approved'
      ? 'Aprovado para avaliação'
      : status === 'review'
      ? 'Requer revisão manual'
      : 'Inconsistências detectadas'

  let message = `📊 **Nova Verificação Completa!**\n\n`
  message += `Cliente: ${customerName}\n`
  message += `Relógio: ${watchInfo}\n`
  message += `Status: ${statusEmoji} ${statusText}\n`

  if (dashboardLink) {
    message += `\nRelatório completo: ${dashboardLink}`
  } else {
    message += `\nCódigo: #VER-${verificationId}`
  }

  return message
}
