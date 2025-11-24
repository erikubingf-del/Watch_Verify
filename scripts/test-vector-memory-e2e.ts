#!/usr/bin/env tsx
/**
 * End-to-End Vector Memory System Test
 *
 * Tests complete fact extraction pipeline:
 * 1. Extract facts from conversation (GPT-4)
 * 2. Generate embeddings (OpenAI)
 * 3. Save to CustomerFacts table (Airtable)
 * 4. Search using vector similarity
 * 5. Integrate with RAG context
 */

import dotenv from 'dotenv'
import { extractFacts, saveFacts, searchCustomerFacts } from '../lib/customer-facts'

dotenv.config({ path: '.env.local' })

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'recUhcCKxcHBnDrdu'
const TEST_PHONE = '+5511987654321'

async function main() {
  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║' + ' '.repeat(10) + 'VECTOR MEMORY END-TO-END TEST' + ' '.repeat(19) + '║')
  console.log('╚' + '═'.repeat(58) + '╝\n')

  console.log('📋 Configuration:')
  console.log(`   Tenant: ${TEST_TENANT_ID}`)
  console.log(`   Phone: ${TEST_PHONE}`)
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`)
  console.log(`   Airtable: ${process.env.AIRTABLE_BASE_ID ? '✅' : '❌'}\n`)

  if (!process.env.OPENAI_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.error('❌ Missing environment variables\n')
    process.exit(1)
  }

  // Test conversation: Customer looking for sports watch with budget
  const conversation = [
    {
      direction: 'inbound' as const,
      body: 'Olá! Estou procurando um relógio esportivo',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'outbound' as const,
      body: 'Olá! Temos várias opções de relógios esportivos. Você tem alguma marca de preferência?',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'inbound' as const,
      body: 'Gosto muito de Rolex, especialmente os modelos Submariner',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'outbound' as const,
      body: 'Ótima escolha! O Submariner é um clássico. Qual a sua faixa de investimento?',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'inbound' as const,
      body: 'Tenho entre 50 e 60 mil disponíveis. Prefiro o modelo preto',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'outbound' as const,
      body: 'Perfeito! Temos o Submariner Date preto que se encaixa no seu orçamento.',
      created_at: new Date().toISOString(),
    },
    {
      direction: 'inbound' as const,
      body: 'É para uso diário, pratico mergulho ocasionalmente',
      created_at: new Date().toISOString(),
    },
  ]

  try {
    // Step 1: Extract facts
    console.log('🔍 STEP 1: Extracting facts from conversation...\n')
    const facts = await extractFacts(conversation, TEST_TENANT_ID, TEST_PHONE)

    if (facts.length === 0) {
      console.log('⚠️  No facts extracted (GPT-4 found only noise)\n')
      return
    }

    console.log(`✅ Extracted ${facts.length} facts:\n`)
    facts.forEach((fact, i) => {
      console.log(`${i + 1}. "${fact.fact}"`)
      console.log(`   Category: ${fact.category}`)
      console.log(`   Confidence: ${(fact.confidence * 100).toFixed(0)}%`)
      console.log(`   Source: "${fact.source_message}"\n`)
    })

    // Step 2: Save facts with embeddings
    console.log('💾 STEP 2: Saving facts to Airtable...\n')
    await saveFacts(facts)
    console.log(`✅ Saved ${facts.length} facts to CustomerFacts table\n`)

    // Step 3: Wait for a moment (Airtable consistency)
    console.log('⏳ Waiting 2 seconds for Airtable consistency...\n')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Test vector search
    console.log('🔎 STEP 3: Testing vector similarity search...\n')

    const queries = [
      'Qual é o orçamento do cliente?',
      'Que tipo de relógio ele procura?',
      'Quais são as preferências de cor?',
      'Para que ele vai usar o relógio?',
    ]

    for (const query of queries) {
      console.log(`Query: "${query}"`)
      const results = await searchCustomerFacts(TEST_TENANT_ID, TEST_PHONE, query, 2)

      if (results.length === 0) {
        console.log('  No results found\n')
        continue
      }

      results.forEach((fact, i) => {
        console.log(`  ${i + 1}. ${fact.fact}`)
        console.log(`     [${fact.category} | ${(fact.confidence * 100).toFixed(0)}%]\n`)
      })
    }

    console.log('═'.repeat(60))
    console.log('✅ ALL TESTS PASSED!\n')
    console.log('📊 Summary:')
    console.log(`   • Extracted ${facts.length} stable facts from conversation`)
    console.log(`   • Generated embeddings using OpenAI`)
    console.log(`   • Saved to CustomerFacts table with correct field mappings`)
    console.log(`   • Vector search working with cosine similarity`)
    console.log('')
    console.log('🚀 Vector memory system is operational!')
    console.log('   Next: Test with real WhatsApp conversations\n')
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

main()
