/**
 * Test Airtable Connection
 * Run: npx tsx scripts/test-airtable.ts
 */

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app4cwmDJPeS604Bv'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ''

async function testConnection() {
  console.log('🔍 Testing Airtable connection...\n')
  console.log(`Base ID: ${AIRTABLE_BASE_ID}`)
  console.log(`API Key: ${AIRTABLE_API_KEY.substring(0, 10)}...`)
  console.log('')

  const tables = [
    'Tenants',
    'StoreNumbers',
    'Customers',
    'Messages',
    'WatchVerify',
    'Catalog',
    'Settings',
    'Users'
  ]

  let successCount = 0
  let failCount = 0

  for (const table of tables) {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}?maxRecords=1`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${table}: Connected (${data.records?.length || 0} records found)`)
        successCount++
      } else {
        const error = await response.text()
        console.log(`❌ ${table}: Failed (${response.status})`)
        if (response.status === 401) {
          console.log(`   Error: Invalid API key`)
        } else if (response.status === 404) {
          console.log(`   Error: Table not found in base`)
        } else {
          console.log(`   Error: ${error}`)
        }
        failCount++
      }
    } catch (error) {
      console.log(`❌ ${table}: Error - ${error}`)
      failCount++
    }
  }

  console.log('')
  console.log(`📊 Results: ${successCount} success, ${failCount} failed`)

  if (failCount > 0) {
    console.log('\n⚠️  Some tables are missing or inaccessible.')
    console.log('Please create missing tables according to AIRTABLE_SCHEMA.md')
    process.exit(1)
  } else {
    console.log('\n🎉 All tables connected successfully!')
    process.exit(0)
  }
}

testConnection()
