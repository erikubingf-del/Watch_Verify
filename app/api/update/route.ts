import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { action, table = 'Settings', id, fields } = await req.json()

    if (action === 'save_settings') {
      // Handle Settings (Tenant Config)
      if (table === 'Settings') {
        if (!id) {
          return NextResponse.json({ ok: false, error: 'Tenant ID required for settings update' }, { status: 400 })
        }

        // We need to fetch the existing config to merge, or just update it
        // Assuming 'fields' contains the config updates
        const tenant = await prisma.tenant.findUnique({ where: { id } })
        if (!tenant) {
          return NextResponse.json({ ok: false, error: 'Tenant not found' }, { status: 404 })
        }

        const currentConfig = (tenant.config as any) || {}
        const newConfig = { ...currentConfig, ...fields }

        const updated = await prisma.tenant.update({
          where: { id },
          data: { config: newConfig }
        })

        return NextResponse.json({ ok: true, id: updated.id })
      }

      // Handle Customers
      if (table === 'Customers') {
        if (id) {
          // Update existing
          const updated = await prisma.customer.update({
            where: { id },
            data: {
              name: fields.name,
              phone: fields.phone,
              // Map other fields if necessary, or put in profile
              profile: fields.profile || undefined
            }
          })
          return NextResponse.json({ ok: true, id: updated.id })
        } else {
          // Create new (requires tenantId)
          if (!fields.tenant_id) {
            return NextResponse.json({ ok: false, error: 'Tenant ID required' }, { status: 400 })
          }

          const created = await prisma.customer.create({
            data: {
              tenantId: fields.tenant_id,
              phone: fields.phone,
              name: fields.name,
              profile: fields.profile || {}
            }
          })
          return NextResponse.json({ ok: true, id: created.id })
        }
      }

      return NextResponse.json({ ok: false, error: `Table ${table} not supported in Prisma refactor` }, { status: 400 })
    }

    return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}
