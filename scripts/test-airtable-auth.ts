import { atSelect } from '@/utils/airtable'
import bcrypt from 'bcryptjs'

async function testAuth() {
  console.log('🧪 Testing Airtable Authentication Setup\n')

  try {
    // Test 1: Check Tenants table
    console.log('1️⃣ Testing Tenants table...')
    const tenants = await atSelect('Tenants', {})
    console.log(`   ✅ Found ${tenants.length} tenant(s)`)
    if (tenants.length > 0) {
      console.log(`   📋 First tenant: ${tenants[0].fields.name} (${tenants[0].id})`)
    }

    // Test 2: Check Users table
    console.log('\n2️⃣ Testing Users table...')
    const users = await atSelect('Users', {})
    console.log(`   ✅ Found ${users.length} user(s)`)

    if (users.length === 0) {
      console.log('   ⚠️  No users found! Please create a user in Airtable.')
      return
    }

    // Test 3: Check user structure
    console.log('\n3️⃣ Testing user structure...')
    const user = users[0]
    console.log(`   📋 Email: ${user.fields.email}`)
    console.log(`   📋 Name: ${user.fields.name}`)
    console.log(`   📋 Role: ${user.fields.role}`)
    console.log(`   📋 Active: ${user.fields.active ? 'Yes' : 'No'}`)
    console.log(`   📋 Has password_hash: ${user.fields.password_hash ? 'Yes' : 'No'}`)
    console.log(`   📋 Tenant ID: ${user.fields.tenant_id}`)

    // Test 4: Test password verification
    console.log('\n4️⃣ Testing password verification...')
    const testPassword = 'admin123'

    if (!user.fields.password_hash) {
      console.log('   ⚠️  No password_hash found! Run: npm run hash-password')
      return
    }

    const isValid = await bcrypt.compare(testPassword, user.fields.password_hash as string)

    if (isValid) {
      console.log(`   ✅ Password verification works!`)
      console.log(`\n🎉 SUCCESS! You can login with:`)
      console.log(`   📧 Email: ${user.fields.email}`)
      console.log(`   🔑 Password: ${testPassword}`)
    } else {
      console.log(`   ⚠️  Password doesn't match. Current hash is for a different password.`)
      console.log(`   💡 Generate new hash with: npm run hash-password`)
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
    console.log('\n💡 Troubleshooting:')
    console.log('   1. Check AIRTABLE_API_KEY in .env.local')
    console.log('   2. Check AIRTABLE_BASE_ID in .env.local')
    console.log('   3. Verify token has correct permissions')
    console.log('   4. Verify base ID matches your Airtable base')
  }
}

testAuth()
