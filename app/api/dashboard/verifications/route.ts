import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, buildFormula } from '@/utils/airtable'
import { logError } from '@/lib/logger'

/**
 * GET /api/dashboard/verifications
 * Returns verification history for the logged-in tenant
 * Optional query params: limit (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 })
    }

    // Get query params
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') || '10'

    // Fetch verifications
    const verifications = await atSelect('WatchVerify', {
      filterByFormula: buildFormula('tenant_id', '=', tenantId),
      maxRecords: limit,
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }]),
    })

    // Map to frontend format
    const mapped = verifications.map((v: any) => {
      // Parse legal risk data if available
      let criticalIssues: string[] = []
      let warnings: string[] = []

      try {
        if (v.fields.issues) {
          criticalIssues = JSON.parse(v.fields.issues)
        }
      } catch (e) {
        // Ignore parse errors
      }

      try {
        if (v.fields.recommendations) {
          warnings = JSON.parse(v.fields.recommendations)
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Determine legal risk based on ICD score (simplified - enhance with actual legal_risk_summary field when available)
      let legalRiskLabel = 'Documentação Completa'
      let legalRiskColor: 'green' | 'yellow' | 'orange' | 'red' = 'green'

      const icd = v.fields.icd || 0
      if (icd < 30) {
        legalRiskLabel = 'Documentos Suspeitos'
        legalRiskColor = 'red'
      } else if (icd < 50) {
        legalRiskLabel = 'Informações Inconsistentes'
        legalRiskColor = 'orange'
      } else if (icd < 70) {
        legalRiskLabel = 'Fotos Incompatíveis'
        legalRiskColor = 'yellow'
      } else if (icd < 85) {
        legalRiskLabel = 'Garantia Ausente'
        legalRiskColor = 'yellow'
      }

      return {
        id: v.id,
        customer: v.fields.customer || 'N/A',
        phone: v.fields.phone || '',
        cpf: v.fields.cpf || null, // Include CPF for masking on frontend
        brand: v.fields.brand || 'N/A',
        model: v.fields.model || '',
        reference: v.fields.reference || '',
        serial: v.fields.serial || '',
        icd: icd,
        status: v.fields.status || 'pending',
        legal_risk_label: legalRiskLabel,
        legal_risk_color: legalRiskColor,
        critical_issues: criticalIssues,
        warnings: warnings,
        date: v.fields.created_at || v.fields.completed_at || new Date().toISOString(),
        photo_url: v.fields.photo_url || '',
        guarantee_url: v.fields.guarantee_url || '',
        invoice_url: v.fields.invoice_url || '',
        notes: v.fields.notes || '',
      }
    })

    return NextResponse.json({ verifications: mapped })
  } catch (error: any) {
    logError('dashboard-verifications', error)
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    )
  }
}
