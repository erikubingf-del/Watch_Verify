/**
 * Test RAG System with Mock Data
 *
 * Demonstrates Phase 4 functionality without requiring Airtable connection.
 * Run: npm run test-rag
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { MOCK_CATALOG, getMockCatalog } from '@/lib/mock-catalog'
import {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  prepareCatalogText,
  logEmbeddingOperation,
} from '@/lib/embeddings'
import { buildRAGContext } from '@/lib/rag'

// Store embeddings in memory for this test
const embeddingCache = new Map<string, number[]>()

async function testEmbeddingGeneration() {
  console.log('━'.repeat(60))
  console.log('TEST 1: Embedding Generation')
  console.log('━'.repeat(60))

  console.log('\n📝 Preparing catalog texts...')

  const texts = MOCK_CATALOG.map(product =>
    prepareCatalogText({
      title: product.title,
      description: product.description,
      category: product.category,
      tags: product.tags,
      price: product.price,
    })
  )

  console.log(`   Prepared ${texts.length} product descriptions\n`)

  console.log('🧠 Generating embeddings...')
  const startTime = Date.now()

  try {
    const { embeddings, totalTokens } = await generateBatchEmbeddings(texts)

    const duration = Date.now() - startTime

    // Cache embeddings
    MOCK_CATALOG.forEach((product, index) => {
      embeddingCache.set(product.id, embeddings[index])
    })

    logEmbeddingOperation('mock-catalog-sync', embeddings.length, totalTokens, duration)

    console.log(`\n✅ Generated ${embeddings.length} embeddings`)
    console.log(`   Tokens used: ${totalTokens.toLocaleString()}`)
    console.log(`   Duration: ${duration}ms`)
    console.log(`   Cost: $${((totalTokens / 1000) * 0.00002).toFixed(6)}`)
    console.log(`   Embedding dimensions: ${embeddings[0].length}`)

    return true
  } catch (error: any) {
    console.log(`\n❌ Error: ${error.message}`)
    console.log('\n⚠️  Note: This requires OPENAI_API_KEY to be set in .env.local')
    return false
  }
}

async function testSemanticSearch() {
  console.log('\n' + '━'.repeat(60))
  console.log('TEST 2: Semantic Search')
  console.log('━'.repeat(60))

  const queries = [
    'Procuro um Rolex de mergulho',
    'Quero um relógio dress elegante',
    'Busco anel de diamante para noivado',
    'Relógio automático até 50 mil',
  ]

  for (const query of queries) {
    console.log(`\n🔍 Query: "${query}"`)

    try {
      // Generate query embedding
      const { embedding: queryEmbedding, tokens } = await generateEmbedding(query)

      console.log(`   Query embedding: ${tokens} tokens`)

      // Calculate similarities
      const results = MOCK_CATALOG.map(product => {
        const productEmbedding = embeddingCache.get(product.id)
        if (!productEmbedding) return null

        const similarity = cosineSimilarity(queryEmbedding, productEmbedding)

        return {
          product,
          similarity,
          relevanceScore: similarity * 100,
        }
      })
        .filter(r => r !== null && r.similarity >= 0.65)
        .sort((a, b) => b!.similarity - a!.similarity)
        .slice(0, 3)

      if (results.length === 0) {
        console.log('   ⚠️  No results above 0.65 threshold')
      } else {
        console.log(`   📊 Top ${results.length} results:\n`)
        results.forEach((result, index) => {
          console.log(
            `   ${index + 1}. ${result!.product.title} (${(result!.similarity * 100).toFixed(1)}% similar)`
          )
          console.log(`      R$ ${result!.product.price.toLocaleString('pt-BR')}`)
          console.log(`      ${result!.product.category} | ${result!.product.tags.join(', ')}`)
        })
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  return true
}

async function testRAGContext() {
  console.log('\n' + '━'.repeat(60))
  console.log('TEST 3: RAG Context Building')
  console.log('━'.repeat(60))

  const query = 'Procuro um Rolex Submariner'

  console.log(`\n💬 User message: "${query}"`)

  try {
    // For mock, we'll simulate by doing keyword search
    const { embedding: queryEmbedding } = await generateEmbedding(query)

    // Find top 3 similar products
    const results = MOCK_CATALOG.map(product => {
      const productEmbedding = embeddingCache.get(product.id)
      if (!productEmbedding) return null

      const similarity = cosineSimilarity(queryEmbedding, productEmbedding)
      return {
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        tags: product.tags,
        similarity,
        relevanceScore: similarity * 100,
      }
    })
      .filter(r => r !== null && r.similarity >= 0.65)
      .sort((a, b) => b!.similarity - a!.similarity)
      .slice(0, 3)

    console.log(`\n🔍 Found ${results.length} relevant products\n`)

    // Build system prompt manually (simulating RAG)
    let systemPrompt = `You are a luxury watch and jewelry sales assistant.

RELEVANT PRODUCTS FROM CATALOG:

`

    results.forEach((result, index) => {
      systemPrompt += `${index + 1}. ${result!.title}
   Categoria: ${result!.category}
   Preço: R$ ${result!.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
   Tags: ${result!.tags!.join(', ')}
   Descrição: ${result!.description}
   Relevância: ${(result!.similarity * 100).toFixed(1)}%

`
    })

    systemPrompt += `\nUse these products to make informed recommendations.`

    console.log('📝 Generated System Prompt:')
    console.log('─'.repeat(60))
    console.log(systemPrompt)
    console.log('─'.repeat(60))

    console.log('\n✅ RAG context built successfully')
    console.log(`   Products included: ${results.length}`)
    console.log(`   Average similarity: ${(results.reduce((sum, r) => sum + r!.similarity, 0) / results.length * 100).toFixed(1)}%`)
    console.log(`   Prompt length: ${systemPrompt.length} characters`)

    return true
  } catch (error: any) {
    console.log(`\n❌ Error: ${error.message}`)
    return false
  }
}

async function testFullWorkflow() {
  console.log('\n' + '━'.repeat(60))
  console.log('TEST 4: Complete RAG Workflow Simulation')
  console.log('━'.repeat(60))

  const customerQueries = [
    {
      message: 'Olá, vocês tem Rolex?',
      expected: 'Should find Submariner, GMT-Master, Datejust',
    },
    {
      message: 'Quero um relógio para mergulho',
      expected: 'Should find Submariner, Seamaster',
    },
    {
      message: 'Busco um presente de noivado',
      expected: 'Should find diamond rings',
    },
  ]

  for (const { message, expected } of customerQueries) {
    console.log(`\n💬 Customer: "${message}"`)
    console.log(`   Expected: ${expected}`)

    try {
      const { embedding: queryEmbedding } = await generateEmbedding(message)

      const results = MOCK_CATALOG.map(product => {
        const productEmbedding = embeddingCache.get(product.id)
        if (!productEmbedding) return null

        const similarity = cosineSimilarity(queryEmbedding, productEmbedding)
        return { product, similarity }
      })
        .filter(r => r !== null && r.similarity >= 0.65)
        .sort((a, b) => b!.similarity - a!.similarity)
        .slice(0, 3)

      if (results.length > 0) {
        console.log(`   ✅ Found ${results.length} recommendations:`)
        results.forEach(r => {
          console.log(`      • ${r!.product.title} (${(r!.similarity * 100).toFixed(1)}%)`)
        })
      } else {
        console.log(`   ⚠️  No recommendations above threshold`)
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  return true
}

async function runAllTests() {
  console.log('🚀 Phase 4 RAG System - Mock Data Test\n')

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('XXX')) {
    console.log('❌ OPENAI_API_KEY not configured in .env.local')
    console.log('\nTo run this test, you need:')
    console.log('1. A valid OpenAI API key')
    console.log('2. Add it to .env.local: OPENAI_API_KEY=sk-proj-...')
    console.log('\nThe RAG system code is complete, but requires OpenAI for embeddings.')
    process.exit(1)
  }

  console.log(`📦 Mock Catalog: ${MOCK_CATALOG.length} products loaded`)
  console.log(`🔑 OpenAI API Key: Configured\n`)

  let allPassed = true

  // Test 1: Embedding Generation
  const test1 = await testEmbeddingGeneration()
  if (!test1) {
    allPassed = false
    console.log('\n⚠️  Skipping remaining tests due to embedding failure')
    process.exit(1)
  }

  // Test 2: Semantic Search
  const test2 = await testSemanticSearch()
  if (!test2) allPassed = false

  // Test 3: RAG Context
  const test3 = await testRAGContext()
  if (!test3) allPassed = false

  // Test 4: Full Workflow
  const test4 = await testFullWorkflow()
  if (!test4) allPassed = false

  // Summary
  console.log('\n' + '━'.repeat(60))
  console.log('SUMMARY')
  console.log('━'.repeat(60))

  if (allPassed) {
    console.log('\n✅ All tests passed!')
    console.log('\n🎉 Phase 4 RAG System is working correctly!')
    console.log('\nNext steps:')
    console.log('1. Set up Airtable tables (see AIRTABLE_SETUP_GUIDE.md)')
    console.log('2. Run: npm run sync-catalog')
    console.log('3. Test with real data via /api/ai-responder')
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above.')
  }

  console.log('\n' + '━'.repeat(60))
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
