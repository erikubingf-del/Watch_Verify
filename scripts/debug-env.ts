import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

console.log('🔍 Environment Variables Debug\n')

console.log('📁 Current Working Directory:', process.cwd())
console.log('📁 .env.local should be at:', resolve(process.cwd(), '.env.local'))

console.log('\n🔑 Airtable Configuration:')
console.log('   AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? `${process.env.AIRTABLE_API_KEY.substring(0, 20)}...` : '❌ NOT SET')
console.log('   AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID || '❌ NOT SET')

console.log('\n🔐 NextAuth Configuration:')
console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set ✅' : '❌ NOT SET')
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET')

// Test if we can read the file
import { existsSync, readFileSync } from 'fs'

const envPath = resolve(process.cwd(), '.env.local')
console.log('\n📄 File Check:')
console.log('   .env.local exists?', existsSync(envPath) ? '✅ Yes' : '❌ No')

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  console.log('   File size:', content.length, 'bytes')
  console.log('   Lines:', content.split('\n').length)

  // Show first few characters of each line (without sensitive data)
  console.log('\n📋 File Content Preview:')
  content.split('\n').forEach((line, i) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=')
      console.log(`   Line ${i + 1}: ${key}=...`)
    } else if (line.trim()) {
      console.log(`   Line ${i + 1}: ${line}`)
    }
  })
}

// Try to make an actual API call
console.log('\n🌐 Testing Airtable API Call...')

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.log('❌ Cannot test - missing credentials')
  process.exit(1)
}

try {
  const url = `https://api.airtable.com/v0/${baseId}/Tenants?maxRecords=1`
  console.log('   URL:', url)
  console.log('   API Key (first 20 chars):', apiKey.substring(0, 20) + '...')

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  console.log('   Response Status:', response.status, response.statusText)

  const data = await response.json()

  if (response.ok) {
    console.log('   ✅ SUCCESS! Found', data.records?.length || 0, 'records')
    if (data.records?.[0]) {
      console.log('   First record ID:', data.records[0].id)
      console.log('   Fields:', Object.keys(data.records[0].fields))
    }
  } else {
    console.log('   ❌ ERROR:', JSON.stringify(data, null, 2))
  }
} catch (error) {
  console.log('   ❌ FETCH ERROR:', error)
}
