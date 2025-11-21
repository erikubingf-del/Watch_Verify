/**
 * Airtable Schema Checker - Simple Node.js version
 * Run: node scripts/check-schema.js
 */

const AIRTABLE_BASE_ID = 'appig3KRYD5neBJqV'
const AIRTABLE_API_KEY = 'patX7MHBsdYeVd3zi.41425ee08ed6caa07b4b81ab1960f7b6375073dca879f631524049e5fd553678'

const EXPECTED_SCHEMA = {
  'Tenants': ['name', 'logo_url', 'primary_color', 'twilio_number', 'created_at', 'active'],
  'Store Numbers': ['tenant_id', 'Phone Number', 'active'],
  'Users': ['tenant_id', 'email', 'password', 'name', 'role', 'phone', 'created_at'],
  'Customers': [
    'tenant_id', 'phone', 'name', 'email', 'last_interest', 'created_at', 'deleted_at',
    // NEW for Feedback
    'budget_min', 'budget_max', 'birthday', 'hobbies', 'notes', 'last_visit', 'updated_at'
  ],
  'Messages': ['tenant_id', 'phone', 'body', 'direction', 'media_url', 'created_at', 'deleted_at'],
  'Catalog': ['tenant_id', 'title', 'description', 'price', 'category', 'brand', 'image_url', 'in_stock', 'created_at'],
  'Embeddings': ['tenant_id', 'catalog_id', 'embedding', 'created_at'],
  'WatchVerify': [
    'tenant_id', 'customer', 'phone', 'brand', 'model', 'reference', 'serial', 'icd', 'status',
    'photo_url', 'guarantee_url', 'invoice_url', 'notes', 'created_at', 'deleted_at',
    // NEW for Enhanced Verification
    'cpf', 'issues', 'recommendations', 'completed_at'
  ],
  'Settings': [
    'tenant_id', 'welcome_message', 'business_hours', 'ai_personality',
    // NEW
    'verification_enabled', 'offers_purchase'
  ],
  'Appointments': [
    'tenant_id', 'customer_phone', 'customer_name', 'date', 'time', 'salesperson_name',
    'product_interest', 'status', 'notes', 'created_at'
  ],
  'StoreAvailability': ['tenant_id', 'day_of_week', 'start_time', 'end_time', 'slots_per_hour', 'active'],
  'BookingSessions': [
    'tenant_id', 'customer_phone', 'customer_name', 'state', 'preferred_date', 'preferred_time',
    'product_interest', 'available_slots', 'created_at'
  ],
  // NEW TABLES
  'VerificationSessions': [
    'tenant_id', 'customer_phone', 'customer_name', 'cpf', 'customer_stated_model',
    'watch_photo_url', 'guarantee_card_url', 'invoice_url', 'additional_documents',
    'date_mismatch_reason', 'state', 'created_at'
  ],
  'FeedbackSessions': [
    'tenant_id', 'salesperson_phone', 'customer_phone', 'customer_name', 'feedback_type',
    'raw_input', 'transcription', 'extracted_data', 'matched_customers', 'state', 'created_at'
  ],
  'BrandKnowledge': [
    'tenant_id', 'brand_name', 'history_summary', 'key_selling_points', 'technical_highlights',
    'target_customer_profile', 'conversation_vocabulary', 'price_positioning', 'must_avoid', 'active'
  ],
  'Salespeople': ['tenant_id', 'name', 'phone', 'email', 'active', 'created_at']
}

async function getTableSchema(tableName) {
  try {
    // Try Meta API first
    const metaResponse = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        }
      }
    )

    if (metaResponse.ok) {
      const metaData = await metaResponse.json()
      const table = metaData.tables.find(t => t.name === tableName)

      if (table) {
        return {
          name: table.name,
          fields: table.fields.map(f => f.name)
        }
      }
    }

    // Fallback: get one record
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const fields = data.records.length > 0 ? Object.keys(data.records[0].fields) : []

    return {
      name: tableName,
      fields
    }
  } catch (error) {
    console.error(`   Error fetching ${tableName}:`, error.message)
    return null
  }
}

async function audit() {
  console.log('🔍 AIRTABLE SCHEMA AUDIT\n')
  console.log(`Base: ${AIRTABLE_BASE_ID}\n`)
  console.log('='.repeat(80) + '\n')

  const results = {
    existing: [],
    missing: [],
    missingFields: {},
    extraFields: {}
  }

  for (const [tableName, expectedFields] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`📋 ${tableName}`)

    const schema = await getTableSchema(tableName)

    if (!schema) {
      console.log(`   ❌ TABLE MISSING\n`)
      results.missing.push(tableName)
      continue
    }

    results.existing.push(tableName)

    const actualFields = schema.fields
    const missing = expectedFields.filter(f => !actualFields.includes(f))
    const extra = actualFields.filter(f => !expectedFields.includes(f))

    if (missing.length === 0 && extra.length === 0) {
      console.log(`   ✅ Complete (${actualFields.length} fields)`)
    } else {
      console.log(`   ⚠️  Schema mismatch:`)
      if (missing.length > 0) {
        console.log(`      Missing: ${missing.join(', ')}`)
        results.missingFields[tableName] = missing
      }
      if (extra.length > 0) {
        console.log(`      Extra: ${extra.join(', ')}`)
        results.extraFields[tableName] = extra
      }
    }

    console.log('')
  }

  console.log('='.repeat(80) + '\n')
  console.log('📊 SUMMARY\n')

  console.log(`✅ Existing: ${results.existing.length}/${Object.keys(EXPECTED_SCHEMA).length} tables`)
  console.log('')

  if (results.missing.length > 0) {
    console.log(`❌ MISSING TABLES (${results.missing.length}):\n`)
    results.missing.forEach(table => {
      console.log(`   📁 ${table}`)
      console.log(`      Fields needed: ${EXPECTED_SCHEMA[table].join(', ')}`)
      console.log('')
    })
  }

  if (Object.keys(results.missingFields).length > 0) {
    console.log(`⚠️  MISSING FIELDS:\n`)
    Object.entries(results.missingFields).forEach(([table, fields]) => {
      console.log(`   📁 ${table}`)
      fields.forEach(field => {
        console.log(`      ➕ Add: ${field}`)
      })
      console.log('')
    })
  }

  if (Object.keys(results.extraFields).length > 0) {
    console.log(`ℹ️  EXTRA FIELDS (not in code, ok to keep):\n`)
    Object.entries(results.extraFields).forEach(([table, fields]) => {
      console.log(`   ${table}: ${fields.join(', ')}`)
    })
    console.log('')
  }

  console.log('='.repeat(80) + '\n')

  if (results.missing.length === 0 && Object.keys(results.missingFields).length === 0) {
    console.log('🎉 SCHEMA IS UP TO DATE!\n')
    console.log('All required tables and fields are present.')
  } else {
    console.log('🚨 ACTION REQUIRED:\n')
    console.log('See AIRTABLE_AUDIT_REPORT.md for detailed setup instructions.')
    console.log('Field types, Single Select options, and examples are documented there.')
  }

  console.log('')
}

audit().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
