import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const dbUrl = process.env.DATABASE_URL
const directUrl = process.env.DIRECT_URL

console.log('DATABASE_URL protocol:', dbUrl ? dbUrl.split(':')[0] : 'undefined')
console.log('DIRECT_URL protocol:', directUrl ? directUrl.split(':')[0] : 'undefined')
