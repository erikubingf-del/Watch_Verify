import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { atSelect, atUpdate } from '@/lib/airtable'
import { generateEmbedding } from '@/lib/semantic-search'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for long-running operation

/**
 * POST /api/dashboard/catalog/generate-embeddings
 * Generates embeddings for products that don't have them
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Fetch products without embeddings
    const products = await atSelect('Catalog', {
      filterByFormula: `AND({tenant_id} = '${tenantId}', OR({embedding} = BLANK(), {embedding} = ''))`
    })

    let generated = 0

    for (const product of products) {
      try {
        const text = `${product.fields.brand} ${product.fields.title} - ${product.fields.description} ${product.fields.tags || ''}`

        const embedding = await generateEmbedding(text)

        await atUpdate('Catalog', product.id, {
          embedding: JSON.stringify(embedding)
        } as any)

        generated++
      } catch (error) {
        console.error(`Error generating embedding for ${product.fields.title}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      total: products.length
    })

  } catch (error) {
    console.error('Error generating embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}
