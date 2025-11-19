/**
 * Password hash generator for creating initial user accounts
 *
 * Usage:
 * npm run hash-password "your-password-here"
 *
 * Then copy the hash to Airtable Users table
 */

import bcrypt from 'bcryptjs'

async function hashPassword(password: string) {
  const saltRounds = 10
  const hash = await bcrypt.hash(password, saltRounds)
  return hash
}

const password = process.argv[2]

if (!password) {
  console.error('Usage: npm run hash-password "your-password"')
  process.exit(1)
}

hashPassword(password).then(hash => {
  console.log('\n✅ Password hash generated:\n')
  console.log(hash)
  console.log('\n📋 Copy this hash to the password_hash field in Airtable Users table\n')
}).catch(error => {
  console.error('Error generating hash:', error)
  process.exit(1)
})
