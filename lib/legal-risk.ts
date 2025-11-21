/**
 * Legal Risk Assessment for Watch Verification
 *
 * Provides human-readable risk categories instead of just ICD scores
 */

import type {
  WatchPhotoAnalysis,
  GuaranteeCardAnalysis,
  InvoiceAnalysis,
  CrossReferenceResult,
} from './document-ocr'

export type LegalRiskCategory =
  | 'complete_documentation'
  | 'missing_guarantee'
  | 'wrong_pictures'
  | 'invoice_outside_brazil'
  | 'inconsistent_information'
  | 'suspicious_documents'

export interface LegalRiskAssessment {
  category: LegalRiskCategory
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red'
  icon: string
  recommendation: string
  icd: number
  criticalIssues: string[]
  warnings: string[]
}

/**
 * Calculate legal risk assessment based on verification data
 */
export function calculateLegalRisk(
  icd: number,
  crossRefResult: CrossReferenceResult,
  photoAnalysis?: WatchPhotoAnalysis,
  guaranteeAnalysis?: GuaranteeCardAnalysis,
  invoiceAnalysis?: InvoiceAnalysis
): LegalRiskAssessment {
  const criticalIssues: string[] = []
  const warnings: string[] = []

  // Check for missing documents
  const missingDocs: string[] = []
  if (!photoAnalysis) missingDocs.push('Foto do relógio')
  if (!guaranteeAnalysis) missingDocs.push('Cartão de garantia')
  if (!invoiceAnalysis) missingDocs.push('Nota fiscal')

  // Check for suspicious indicators
  const isSuspicious = icd < 30 || crossRefResult.criticalIssues.some((issue) =>
    issue.toLowerCase().includes('fake') ||
    issue.toLowerCase().includes('fraud') ||
    issue.toLowerCase().includes('falsificad')
  )

  // Check for invoice country
  const invoiceOutsideBrazil =
    invoiceAnalysis &&
    invoiceAnalysis.country &&
    invoiceAnalysis.country.toLowerCase() !== 'brazil' &&
    invoiceAnalysis.country.toLowerCase() !== 'brasil'

  // Check for document mismatches
  const hasWrongPictures = crossRefResult.criticalIssues.some(
    (issue) =>
      issue.includes('Serial number') ||
      issue.includes('Reference') ||
      issue.includes('mismatch') ||
      issue.includes('não corresponde')
  )

  // Priority 1: Suspicious documents (highest risk)
  if (isSuspicious) {
    criticalIssues.push(
      ...(crossRefResult.criticalIssues.filter((i) =>
        i.toLowerCase().includes('fake') ||
        i.toLowerCase().includes('fraud') ||
        i.toLowerCase().includes('falsificad')
      ))
    )

    return {
      category: 'suspicious_documents',
      label: 'Documentos Suspeitos',
      color: 'red',
      icon: '🚫',
      recommendation:
        'NÃO PROSSEGUIR - Indicadores de fraude detectados. Consulte especialista imediatamente.',
      icd,
      criticalIssues: criticalIssues.length > 0 ? criticalIssues : ['ICD muito baixo (< 30)'],
      warnings,
    }
  }

  // Priority 2: Inconsistent information (high risk)
  if (icd < 50) {
    criticalIssues.push(...crossRefResult.criticalIssues)

    return {
      category: 'inconsistent_information',
      label: 'Informações Inconsistentes',
      color: 'orange',
      icon: '⚠️',
      recommendation:
        'Alto risco - Inconsistências graves entre documentos. Recomenda-se não prosseguir.',
      icd,
      criticalIssues,
      warnings: crossRefResult.passedChecks,
    }
  }

  // Priority 3: Invoice outside Brazil (tax/import risk)
  if (invoiceOutsideBrazil) {
    warnings.push(`Nota fiscal emitida em: ${invoiceAnalysis!.country}`)
    warnings.push('Verifique documentação de importação')
    warnings.push('Possíveis implicações fiscais')

    return {
      category: 'invoice_outside_brazil',
      label: 'Nota Fiscal do Exterior',
      color: 'orange',
      icon: '⚠️',
      recommendation:
        'Verificar documentação de importação e compliance fiscal. Consulte contador/advogado.',
      icd,
      criticalIssues,
      warnings,
    }
  }

  // Priority 4: Wrong pictures / mismatched documents
  if (hasWrongPictures && icd < 70) {
    criticalIssues.push(
      ...crossRefResult.criticalIssues.filter(
        (i) =>
          i.includes('Serial') ||
          i.includes('Reference') ||
          i.includes('mismatch') ||
          i.includes('não corresponde')
      )
    )

    return {
      category: 'wrong_pictures',
      label: 'Documentos Incompatíveis',
      color: 'yellow',
      icon: '⚠️',
      recommendation:
        'Documentos não correspondem ao relógio. Solicite documentação correta ou verificação manual.',
      icd,
      criticalIssues,
      warnings: crossRefResult.passedChecks,
    }
  }

  // Priority 5: Missing guarantee card
  if (missingDocs.includes('Cartão de garantia') && icd < 85) {
    warnings.push('Cartão de garantia não fornecido')
    warnings.push('Autenticidade mais difícil de verificar')

    return {
      category: 'missing_guarantee',
      label: 'Sem Cartão de Garantia',
      color: 'yellow',
      icon: '⚠️',
      recommendation:
        'Prosseguir com cautela - Sem garantia oficial. Verificação presencial altamente recomendada.',
      icd,
      criticalIssues,
      warnings,
    }
  }

  // Priority 6: Complete documentation (low risk)
  if (icd >= 70 && missingDocs.length === 0) {
    return {
      category: 'complete_documentation',
      label: 'Documentação Completa',
      color: 'green',
      icon: '✅',
      recommendation:
        'Baixo risco - Documentação completa e consistente. Agendar avaliação presencial.',
      icd,
      criticalIssues: [],
      warnings: icd < 85 ? ['Verificação presencial ainda recomendada'] : [],
    }
  }

  // Fallback: Medium confidence
  return {
    category: 'inconsistent_information',
    label: 'Requer Análise Manual',
    color: 'orange',
    icon: '⚠️',
    recommendation: 'Verificação manual necessária. Consulte especialista.',
    icd,
    criticalIssues: crossRefResult.criticalIssues,
    warnings: crossRefResult.passedChecks,
  }
}

/**
 * Get badge color class for frontend display
 */
export function getRiskBadgeColor(category: LegalRiskCategory): string {
  const colors: Record<LegalRiskCategory, string> = {
    complete_documentation: 'bg-green-100 text-green-800 border-green-200',
    missing_guarantee: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    wrong_pictures: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    invoice_outside_brazil: 'bg-orange-100 text-orange-800 border-orange-200',
    inconsistent_information: 'bg-orange-100 text-orange-800 border-orange-200',
    suspicious_documents: 'bg-red-100 text-red-800 border-red-200',
  }

  return colors[category]
}

/**
 * Get risk score (0-100) where 100 is safest
 */
export function getRiskScore(category: LegalRiskCategory, icd: number): number {
  // Weight the ICD score based on category
  const categoryWeights: Record<LegalRiskCategory, number> = {
    complete_documentation: 1.0, // No penalty
    missing_guarantee: 0.85, // 15% penalty
    wrong_pictures: 0.75, // 25% penalty
    invoice_outside_brazil: 0.8, // 20% penalty
    inconsistent_information: 0.6, // 40% penalty
    suspicious_documents: 0.3, // 70% penalty
  }

  return Math.round(icd * categoryWeights[category])
}

/**
 * Format legal risk for Airtable storage (single select field)
 */
export function formatLegalRiskForAirtable(assessment: LegalRiskAssessment): string {
  return assessment.label
}

/**
 * Get WhatsApp message template for owner based on risk
 */
export function getOwnerWhatsAppTemplate(
  customerName: string,
  brand: string,
  model: string,
  assessment: LegalRiskAssessment
): string {
  const templates: Record<LegalRiskCategory, string> = {
    complete_documentation: `Olá ${customerName}! Recebemos a verificação do seu ${brand} ${model}.

✅ Documentação completa e consistente! (Score: ${assessment.icd}/100)

Quando você poderia visitar nossa boutique para uma avaliação presencial?
Temos disponibilidade esta semana.

Qual horário funciona melhor para você?`,

    missing_guarantee: `Olá ${customerName}! Recebemos a verificação do seu ${brand} ${model}.

⚠️ Notamos que não foi enviado o cartão de garantia original.

Para prosseguir com a avaliação, precisaremos:
- Verificação presencial mais detalhada
- Documentação adicional (se disponível)

Poderia agendar uma visita? Nossos especialistas poderão te orientar melhor.`,

    wrong_pictures: `Olá ${customerName}! Recebemos a verificação do seu ${brand} ${model}.

📋 Detectamos algumas inconsistências entre os documentos enviados.

Seria possível nos encontrar pessoalmente para esclarecer alguns detalhes?
Isso nos ajudará a fazer uma avaliação mais precisa.

Quando você teria disponibilidade?`,

    invoice_outside_brazil: `Olá ${customerName}! Recebemos a verificação do seu ${brand} ${model}.

📋 Notamos que a nota fiscal é do exterior (${assessment.warnings[0]}).

Para prosseguir, precisaremos verificar:
- Documentação de importação
- Compliance fiscal brasileiro

Poderia agendar uma visita para conversarmos pessoalmente?`,

    inconsistent_information: `Olá ${customerName}, obrigado pelo interesse em vender seu ${brand} ${model}.

Infelizmente, precisamos de esclarecimentos sobre a documentação enviada.
Detectamos algumas inconsistências que precisam ser verificadas.

Poderia nos enviar:
${assessment.criticalIssues.map((i) => `- ${i}`).join('\n')}

Ou, se preferir, pode agendar uma visita para trazer os documentos pessoalmente.`,

    suspicious_documents: `Olá ${customerName}, obrigado pelo contato.

Após análise preliminar do ${brand} ${model}, infelizmente não poderemos prosseguir
com a avaliação neste momento devido a inconsistências graves na documentação.

Recomendamos que você busque uma segunda opinião com outro especialista.

Ficamos à disposição caso tenha dúvidas.`,
  }

  return templates[assessment.category]
}
