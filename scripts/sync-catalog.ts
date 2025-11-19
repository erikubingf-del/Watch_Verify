/**
 * Catalog Embedding Sync Script
 *
 * Generates embeddings for catalog items that don't have them yet.
 * Run periodically via cron or manually when new products are added.
 *
 * Usage:
 *   npm run sync-catalog           # Sync all catalogs
 *   npm run sync-catalog --force   # Regenerate all embeddings
 */

import { atSelect, atUpdate } from '@/utils/airtable'
import {
  generateBatchEmbeddings,
  prepareCatalogText,
  embeddingToBase64,
  logEmbeddingOperation,
  calculateEmbeddingCost,
} from '@/lib/embeddings'
import { logInfo, logError, logWarn } from '@/lib/logger'

interface CatalogRecord {
  id: string
  fields: {
    tenant_id: string
    title: string
    description: string
    category?: string
    tags?: string[]
    price?: number
    embedding?: string
    active: boolean
  }
}

async function syncCatalog() {
  const startTime = Date.now()
  const forceRegenerate = process.argv.includes('--force')

  console.log('🔄 Starting catalog embedding sync...\n')

  if (forceRegenerate) {
    console.log('⚠️  Force mode: Regenerating ALL embeddings\n')
  }

  // Step 1: Fetch all active catalog items
  const filterFormula = forceRegenerate
    ? '{active}=TRUE()'
    : 'AND({active}=TRUE(), {embedding}="")'

  console.log(`📥 Fetching catalog items...`)

  let records: any[]
  try {
    records = await atSelect<CatalogRecord>('Catalog', {
      filterByFormula: filterFormula,
    }) as any
  } catch (error: any) {
    console.error(`❌ Failed to fetch catalog: ${error.message}`)
    process.exit(1)
  }

  console.log(`   Found ${records.length} items to process\n`)

  if (records.length === 0) {
    console.log('✅ All catalog items already have embeddings!')
    console.log('\n💡 Use --force flag to regenerate all embeddings')
    process.exit(0)
  }

  // Step 2: Prepare texts for embedding
  console.log('📝 Preparing texts...')

  const itemsToProcess: Array<{
    record: CatalogRecord
    text: string
  }> = []

  for (const record of records) {
    try {
      const text = prepareCatalogText({
        title: record.fields.title,
        description: record.fields.description,
        category: record.fields.category,
        tags: record.fields.tags,
        price: record.fields.price,
      })

      itemsToProcess.push({ record, text })
    } catch (error: any) {
      logError('prepare-catalog-text', error, { recordId: record.id })
      console.log(`   ⚠️  Skipped ${record.fields.title}: ${error.message}`)
    }
  }

  console.log(`   Prepared ${itemsToProcess.length} texts\n`)

  // Step 3: Generate embeddings in batches
  const BATCH_SIZE = 100 // OpenAI allows up to 2048, but 100 is safer
  const batches = []

  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    batches.push(itemsToProcess.slice(i, i + BATCH_SIZE))
  }

  console.log(`🧠 Generating embeddings (${batches.length} batches)...\n`)

  let totalTokens = 0
  let successCount = 0
  let failCount = 0

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchNum = batchIndex + 1

    console.log(`   Batch ${batchNum}/${batches.length} (${batch.length} items)...`)

    try {
      const texts = batch.map((item) => item.text)
      const batchStart = Date.now()

      const { embeddings, totalTokens: batchTokens } = await generateBatchEmbeddings(
        texts
      )

      const batchDuration = Date.now() - batchStart
      totalTokens += batchTokens

      logEmbeddingOperation('batch-sync', batch.length, batchTokens, batchDuration)

      // Step 4: Update Airtable records with embeddings
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i]
        const embedding = embeddings[i]

        try {
          const embeddingBase64 = embeddingToBase64(embedding)

          await atUpdate('Catalog', item.record.id, {
            embedding: embeddingBase64,
          })

          successCount++
        } catch (error: any) {
          logError('update-embedding', error, {
            recordId: item.record.id,
            title: item.record.fields.title,
          })
          failCount++
        }
      }

      console.log(
        `   ✅ Batch ${batchNum} complete (${batchTokens} tokens, ${batchDuration}ms)`
      )

      // Rate limiting: Wait 1 second between batches to avoid hitting OpenAI limits
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      logError('batch-embedding-generation', error, { batchIndex })
      console.log(`   ❌ Batch ${batchNum} failed: ${error.message}`)
      failCount += batch.length
    }
  }

  // Step 5: Summary
  const totalDuration = Date.now() - startTime
  const totalCost = calculateEmbeddingCost(totalTokens)

  console.log('\n' + '='.repeat(60))
  console.log('📊 SYNC SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Success: ${successCount} items`)
  console.log(`❌ Failed: ${failCount} items`)
  console.log(`🪙 Tokens used: ${totalTokens.toLocaleString()}`)
  console.log(`💵 Estimated cost: $${totalCost.toFixed(6)}`)
  console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`)
  console.log(`📈 Throughput: ${((successCount / totalDuration) * 1000).toFixed(1)} items/sec`)
  console.log('='.repeat(60))

  if (failCount > 0) {
    console.log('\n⚠️  Some items failed. Check logs for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All catalog items synced successfully!')
    process.exit(0)
  }
}

// Run sync
syncCatalog().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
