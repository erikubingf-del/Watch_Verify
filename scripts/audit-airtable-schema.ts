/**
 * Audit Airtable Schema
 * Checks current tables and fields, compares with requirements
 */

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appig3KRYD5neBJqV'
const AIRTABLE_API_KEY =
  process.env.AIRTABLE_API_KEY ||
  'patX7MHBsdYeVd3zi.41425ee08ed6caa07b4b81ab1960f7b6375073dca879f631524049e5fd553678'

async function auditSchema() {
  console.log('🔍 Auditing Airtable Schema...\n')
  console.log(`Base ID: ${AIRTABLE_BASE_ID}\n`)

  const tables = [
    'Tenants',
    'Store Numbers',
    'Users',
    'Salespeople',
    'Customers',
    'Messages',
    'Catalog',
    'Embeddings',
    'WatchVerify',
    'Settings',
    'Appointments',
    'StoreAvailability',
    'BookingSessions',
    'VerificationSessions',
    'FeedbackSessions',
    'BrandKnowledge',
  ]

  console.log('📋 Checking tables and fields...\n')

  for (const table of tables) {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}?maxRecords=1`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const fields = data.records.length > 0 ? Object.keys(data.records[0].fields) : []

        console.log(`✅ ${table}`)
        if (fields.length > 0) {
          console.log(`   Fields: ${fields.join(', ')}`)
        } else {
          console.log(`   ⚠️  No records found (cannot determine fields)`)
        }
        console.log('')
      } else if (response.status === 404) {
        console.log(`❌ ${table} - TABLE MISSING`)
        console.log('')
      } else {
        const error = await response.text()
        console.log(`❌ ${table} - Error ${response.status}: ${error}`)
        console.log('')
      }
    } catch (error) {
      console.log(`❌ ${table} - Error: ${error}`)
      console.log('')
    }
  }

  console.log('\n' + '='.repeat(80) + '\n')
  console.log('📝 REQUIRED CHANGES FOR NEW FEATURES:\n')

  console.log('1️⃣ ENHANCED VERIFICATION SYSTEM:')
  console.log('   Create VerificationSessions table with fields:')
  console.log('   - tenant_id (Link to Tenants)')
  console.log('   - customer_phone (Phone)')
  console.log('   - customer_name (Single line text)')
  console.log('   - cpf (Single line text - encrypted)')
  console.log('   - customer_stated_model (Single line text)')
  console.log('   - watch_photo_url (URL)')
  console.log('   - guarantee_card_url (URL)')
  console.log('   - invoice_url (URL)')
  console.log('   - additional_documents (Long text - JSON array)')
  console.log('   - date_mismatch_reason (Long text)')
  console.log('   - state (Single select: awaiting_cpf, awaiting_watch_info, etc.)')
  console.log('   - created_at (Date & time)')
  console.log('')

  console.log('   Update Settings table - add fields:')
  console.log('   - verification_enabled (Checkbox)')
  console.log('   - offers_purchase (Checkbox)')
  console.log('')

  console.log('2️⃣ SALESPERSON FEEDBACK SYSTEM:')
  console.log('   Create FeedbackSessions table with fields:')
  console.log('   - tenant_id (Link to Tenants)')
  console.log('   - salesperson_phone (Phone)')
  console.log('   - customer_phone (Phone)')
  console.log('   - customer_name (Single line text)')
  console.log('   - feedback_type (Single select: audio, text)')
  console.log('   - raw_input (Long text)')
  console.log('   - transcription (Long text)')
  console.log('   - extracted_data (Long text - JSON)')
  console.log('   - matched_customers (Long text - JSON)')
  console.log('   - state (Single select: awaiting_transcription, awaiting_extraction, etc.)')
  console.log('   - created_at (Date & time)')
  console.log('')

  console.log('   Update Customers table - add fields:')
  console.log('   - budget_min (Number)')
  console.log('   - budget_max (Number)')
  console.log('   - birthday (Single line text - MM-DD format)')
  console.log('   - hobbies (Long text)')
  console.log('   - notes (Long text)')
  console.log('   - last_visit (Date)')
  console.log('   - updated_at (Date & time)')
  console.log('')

  console.log('3️⃣ BRAND KNOWLEDGE SYSTEM:')
  console.log('   Create BrandKnowledge table with fields:')
  console.log('   - tenant_id (Link to Tenants - optional, global if empty)')
  console.log('   - brand_name (Single line text)')
  console.log('   - history_summary (Long text)')
  console.log('   - key_selling_points (Long text)')
  console.log('   - technical_highlights (Long text)')
  console.log('   - target_customer_profile (Long text)')
  console.log('   - conversation_vocabulary (Long text)')
  console.log('   - price_positioning (Long text)')
  console.log('   - must_avoid (Long text)')
  console.log('   - active (Checkbox)')
  console.log('')

  console.log('\n' + '='.repeat(80) + '\n')
}

auditSchema().catch(console.error)
