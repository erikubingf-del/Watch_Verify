import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    // Fetch products without embeddings using raw query (Prisma doesn't expose Unsupported fields in where)
    const products = await prisma.$queryRaw`
      SELECT id, title, description, brand, tags
      FROM products
      WHERE "tenantId" = ${tenantId}
      AND embedding IS NULL
      LIMIT 50
    ` as any[]

    let generated = 0

    for (const product of products) {
      try {
        const text = `${product.brand || ''} ${product.title} - ${product.description} ${product.tags ? product.tags.join(' ') : ''}`.trim()

        const { embedding } = await generateEmbedding(text)
        const vectorString = JSON.stringify(embedding)

        // Update product with embedding
        await prisma.$executeRaw`
          UPDATE products
          SET embedding = ${vectorString}::vector
          WHERE id = ${product.id}
        `

        generated++
      } catch (error) {
        console.error(`Error generating embedding for ${product.title}:`, error)
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
