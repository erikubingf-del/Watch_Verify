import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atUpdate, atDelete } from '@/lib/airtable'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/dashboard/catalog/[id]
 * Updates a product
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Update product
    await atUpdate('Catalog', params.id, {
      title: body.title,
      brand: body.brand,
      description: body.description,
      price: body.price,
      category: body.category,
      image_url: body.image_url || '',
      stock_quantity: body.stock_quantity || 0,
      tags: Array.isArray(body.tags) ? body.tags.join(', ') : body.tags,
      active: body.active !== false,
    } as any)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/catalog/[id]
 * Deletes a product
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await atDelete('Catalog', params.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
