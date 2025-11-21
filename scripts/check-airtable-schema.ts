/**
 * Comprehensive Airtable Schema Checker
 * Fetches actual schema from Airtable and compares with code requirements
 */

import { config } from 'dotenv'

config()

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!

// Expected schema based on codebase
const EXPECTED_SCHEMA = {
  Tenants: ['name', 'logo_url', 'primary_color', 'twilio_number', 'created_at', 'active'],
  'Store Numbers': ['tenant_id', 'Phone Number', 'active'],
  Users: ['tenant_id', 'email', 'password', 'name', 'role', 'phone', 'created_at'],
  Customers: [
    'tenant_id',
    'phone',
    'name',
    'email',
    'last_interest',
    'created_at',
    'deleted_at',
    // NEW for Feedback System
    'budget_min',
    'budget_max',
    'birthday',
    'hobbies',
    'notes',
    'last_visit',
    'updated_at',
  ],
  Messages: ['tenant_id', 'phone', 'body', 'direction', 'media_url', 'created_at', 'deleted_at'],
  Catalog: [
    'tenant_id',
    'title',
    'description',
    'price',
    'category',
    'brand',
    'image_url',
    'in_stock',
    'created_at',
  ],
  Embeddings: ['tenant_id', 'catalog_id', 'embedding', 'created_at'],
  WatchVerify: [
    'tenant_id',
    'customer',
    'phone',
    'brand',
    'model',
    'reference',
    'serial',
    'icd',
    'status',
    'photo_url',
    'guarantee_url',
    'invoice_url',
    'notes',
    'created_at',
    'deleted_at',
    // NEW for Enhanced Verification
    'cpf',
    'issues',
    'recommendations',
    'completed_at',
  ],
  Settings: [
    'tenant_id',
    'welcome_message',
    'business_hours',
    'ai_personality',
    // NEW for Enhanced Verification
    'verification_enabled',
    'offers_purchase',
  ],
  Appointments: [
    'tenant_id',
    'customer_phone',
    'customer_name',
    'date',
    'time',
    'salesperson_name',
    'product_interest',
    'status',
    'notes',
    'created_at',
  ],
  StoreAvailability: ['tenant_id', 'day_of_week', 'start_time', 'end_time', 'slots_per_hour', 'active'],
  BookingSessions: [
    'tenant_id',
    'customer_phone',
    'customer_name',
    'state',
    'preferred_date',
    'preferred_time',
    'product_interest',
    'available_slots',
    'created_at',
  ],
  // NEW TABLES
  VerificationSessions: [
    'tenant_id',
    'customer_phone',
    'customer_name',
    'cpf',
    'customer_stated_model',
    'watch_photo_url',
    'guarantee_card_url',
    'invoice_url',
    'additional_documents',
    'date_mismatch_reason',
    'state',
    'created_at',
  ],
  FeedbackSessions: [
    'tenant_id',
    'salesperson_phone',
    'customer_phone',
    'customer_name',
    'feedback_type',
    'raw_input',
    'transcription',
    'extracted_data',
    'matched_customers',
    'state',
    'created_at',
  ],
  BrandKnowledge: [
    'tenant_id',
    'brand_name',
    'history_summary',
    'key_selling_points',
    'technical_highlights',
    'target_customer_profile',
    'conversation_vocabulary',
    'price_positioning',
    'must_avoid',
    'active',
  ],
  Salespeople: ['tenant_id', 'name', 'phone', 'email', 'active', 'created_at'],
}

interface FieldInfo {
  id: string
  name: string
  type: string
}

interface TableSchema {
  name: string
  fields: FieldInfo[]
}

async function getTableSchema(tableName: string): Promise<TableSchema | null> {
  try {
    // Get table metadata using Airtable Meta API
    const metaResponse = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    )

    if (!metaResponse.ok) {
      throw new Error(`Meta API failed: ${metaResponse.status}`)
    }

    const metaData = await metaResponse.json()
    const table = metaData.tables.find((t: any) => t.name === tableName)

    if (!table) {
      return null
    }

    return {
      name: table.name,
      fields: table.fields.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
      })),
    }
  } catch (error: any) {
    // Fallback: Try to get one record to infer fields
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed: ${response.status}`)
      }

      const data = await response.json()
      const fields =
        data.records.length > 0
          ? Object.keys(data.records[0].fields).map((name, idx) => ({
              id: `fld${idx}`,
              name,
              type: 'unknown',
            }))
          : []

      return {
        name: tableName,
        fields,
      }
    } catch (fallbackError) {
      console.error(`Error fetching ${tableName}:`, fallbackError)
      return null
    }
  }
}

async function auditSchema() {
  console.log('🔍 COMPREHENSIVE AIRTABLE SCHEMA AUDIT\n')
  console.log(`Base ID: ${AIRTABLE_BASE_ID}`)
  console.log(`Using: Airtable Meta API + fallback\n`)
  console.log('=' .repeat(80) + '\n')

  const results: {
    existing: string[]
    missing: string[]
    missingFields: Record<string, string[]>
    extraFields: Record<string, string[]>
  } = {
    existing: [],
    missing: [],
    missingFields: {},
    extraFields: {},
  }

  for (const [tableName, expectedFields] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`📋 Checking table: ${tableName}`)

    const schema = await getTableSchema(tableName)

    if (!schema) {
      console.log(`   ❌ TABLE MISSING\n`)
      results.missing.push(tableName)
      continue
    }

    results.existing.push(tableName)

    const actualFieldNames = schema.fields.map((f) => f.name)
    const missingFields = expectedFields.filter((f) => !actualFieldNames.includes(f))
    const extraFields = actualFieldNames.filter((f) => !expectedFields.includes(f))

    if (missingFields.length === 0 && extraFields.length === 0) {
      console.log(`   ✅ All fields present (${actualFieldNames.length} fields)`)
    } else {
      console.log(`   ⚠️  Schema mismatch:`)

      if (missingFields.length > 0) {
        console.log(`      Missing fields: ${missingFields.join(', ')}`)
        results.missingFields[tableName] = missingFields
      }

      if (extraFields.length > 0) {
        console.log(`      Extra fields: ${extraFields.join(', ')}`)
        results.extraFields[tableName] = extraFields
      }
    }

    console.log(`   Fields: ${actualFieldNames.join(', ')}`)
    console.log('')
  }

  console.log('=' .repeat(80) + '\n')
  console.log('📊 AUDIT SUMMARY\n')

  console.log(`✅ Existing tables: ${results.existing.length}/${Object.keys(EXPECTED_SCHEMA).length}`)
  if (results.existing.length > 0) {
    console.log(`   ${results.existing.join(', ')}`)
  }
  console.log('')

  if (results.missing.length > 0) {
    console.log(`❌ Missing tables: ${results.missing.length}`)
    results.missing.forEach((table) => {
      console.log(`   - ${table}`)
    })
    console.log('')
  }

  if (Object.keys(results.missingFields).length > 0) {
    console.log(`⚠️  Tables with missing fields: ${Object.keys(results.missingFields).length}`)
    Object.entries(results.missingFields).forEach(([table, fields]) => {
      console.log(`   ${table}:`)
      fields.forEach((field) => {
        console.log(`      - ${field}`)
      })
    })
    console.log('')
  }

  if (Object.keys(results.extraFields).length > 0) {
    console.log(`ℹ️  Tables with extra fields (not in code): ${Object.keys(results.extraFields).length}`)
    Object.entries(results.extraFields).forEach(([table, fields]) => {
      console.log(`   ${table}: ${fields.join(', ')}`)
    })
    console.log('')
  }

  console.log('=' .repeat(80) + '\n')

  if (results.missing.length > 0 || Object.keys(results.missingFields).length > 0) {
    console.log('🚨 ACTION REQUIRED:\n')

    if (results.missing.length > 0) {
      console.log('1️⃣ CREATE MISSING TABLES:')
      results.missing.forEach((table) => {
        console.log(`   - ${table}`)
        console.log(`     Fields: ${EXPECTED_SCHEMA[table as keyof typeof EXPECTED_SCHEMA].join(', ')}`)
      })
      console.log('')
    }

    if (Object.keys(results.missingFields).length > 0) {
      console.log('2️⃣ ADD MISSING FIELDS:')
      Object.entries(results.missingFields).forEach(([table, fields]) => {
        console.log(`   ${table}:`)
        fields.forEach((field) => {
          console.log(`      - Add field: ${field}`)
        })
      })
      console.log('')
    }

    console.log('📖 See AIRTABLE_AUDIT_REPORT.md for detailed field types and specifications')
  } else {
    console.log('🎉 SCHEMA IS UP TO DATE!')
    console.log('All required tables and fields are present.')
  }

  console.log('')
}

// Run audit
auditSchema().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
