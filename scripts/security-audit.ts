/**
 * Security Audit Script
 * Checks for common security issues in the codebase
 *
 * Usage: npm run audit-security
 */

import * as fs from 'fs'
import * as path from 'path'

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line?: number
  message: string
}

const issues: SecurityIssue[] = []

// Check environment variables
function checkEnvVars() {
  console.log('🔍 Checking environment variables...\n')

  const requiredVars = [
    'AIRTABLE_BASE_ID',
    'AIRTABLE_API_KEY',
    'OPENAI_API_KEY',
    'NEXTAUTH_SECRET',
    'TWILIO_AUTH_TOKEN',
  ]

  const envExample = fs.existsSync('.env.example')
  if (!envExample) {
    issues.push({
      severity: 'medium',
      file: '.env.example',
      message: '.env.example file not found',
    })
  }

  // Check if secrets are hardcoded
  const filesToCheck = [
    'app/api/**/*.ts',
    'utils/**/*.ts',
    'lib/**/*.ts',
  ]

  const secretPatterns = [
    /AIRTABLE_API_KEY\s*=\s*['"](?!process\.env)[^'"]+['"]/,
    /OPENAI_API_KEY\s*=\s*['"](?!process\.env)[^'"]+['"]/,
    /sk-[a-zA-Z0-9]+/,
    /pat[a-zA-Z0-9]+/,
  ]

  // Scan files for hardcoded secrets
  function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      secretPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            severity: 'critical',
            file: filePath,
            line: index + 1,
            message: 'Potential hardcoded secret detected',
          })
        }
      })
    })
  }

  console.log('✅ Environment variables check complete\n')
}

// Check for SQL injection vulnerabilities (Airtable formula injection)
function checkSQLInjection() {
  console.log('🔍 Checking for formula injection vulnerabilities...\n')

  const dangerousPatterns = [
    /filterByFormula:\s*`[^`]*\$\{[^}]+\}[^`]*`/,
    /filterByFormula:\s*"[^"]*\$\{[^}]+\}[^"]*"/,
    /filterByFormula:\s*'[^']*\$\{[^}]+\}[^']*'/,
  ]

  function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      dangerousPatterns.forEach((pattern) => {
        if (pattern.test(line) && !line.includes('sanitizeForFormula') && !line.includes('buildFormula')) {
          issues.push({
            severity: 'high',
            file: filePath,
            line: index + 1,
            message: 'Potential formula injection - use buildFormula() or sanitizeForFormula()',
          })
        }
      })
    })
  }

  const apiFiles = getAllFiles('app/api')
  apiFiles.forEach(scanFile)

  console.log('✅ Formula injection check complete\n')
}

// Check for missing rate limiting
function checkRateLimiting() {
  console.log('🔍 Checking for rate limiting...\n')

  const apiRoutes = getAllFiles('app/api')

  apiRoutes.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8')

    // Skip webhook routes (handled separately)
    if (file.includes('webhook')) return

    // Check if route has rate limiting
    if (!content.includes('rateLimitMiddleware') && !content.includes('checkRateLimit')) {
      issues.push({
        severity: 'medium',
        file,
        message: 'API route missing rate limiting',
      })
    }
  })

  console.log('✅ Rate limiting check complete\n')
}

// Check for missing input validation
function checkInputValidation() {
  console.log('🔍 Checking for input validation...\n')

  const apiRoutes = getAllFiles('app/api')

  apiRoutes.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8')

    // Check if route validates input
    if (
      content.includes('req.json()') &&
      !content.includes('validate(') &&
      !content.includes('schema.parse') &&
      !file.includes('auth')
    ) {
      issues.push({
        severity: 'medium',
        file,
        message: 'API route missing input validation',
      })
    }
  })

  console.log('✅ Input validation check complete\n')
}

// Check authentication on protected routes
function checkAuthentication() {
  console.log('🔍 Checking authentication...\n')

  // Check if middleware.ts exists
  if (!fs.existsSync('middleware.ts')) {
    issues.push({
      severity: 'critical',
      file: 'middleware.ts',
      message: 'middleware.ts not found - authentication may not be enforced',
    })
  }

  // Check dashboard routes
  const dashboardFiles = getAllFiles('app/dashboard')

  dashboardFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8')

    if (file.includes('layout.tsx')) {
      if (!content.includes('auth()') && !content.includes('getSession')) {
        issues.push({
          severity: 'high',
          file,
          message: 'Dashboard layout missing authentication check',
        })
      }
    }
  })

  console.log('✅ Authentication check complete\n')
}

// Utility: Get all files recursively
function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList

  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// Print results
function printResults() {
  console.log('\n' + '='.repeat(60))
  console.log('🔒 SECURITY AUDIT RESULTS')
  console.log('='.repeat(60) + '\n')

  if (issues.length === 0) {
    console.log('✅ No security issues found!\n')
    return
  }

  const critical = issues.filter((i) => i.severity === 'critical')
  const high = issues.filter((i) => i.severity === 'high')
  const medium = issues.filter((i) => i.severity === 'medium')
  const low = issues.filter((i) => i.severity === 'low')

  console.log(`Total issues found: ${issues.length}\n`)
  console.log(`🔴 Critical: ${critical.length}`)
  console.log(`🟠 High: ${high.length}`)
  console.log(`🟡 Medium: ${medium.length}`)
  console.log(`🟢 Low: ${low.length}\n`)

  console.log('='.repeat(60) + '\n')

  // Print each issue
  ;[...critical, ...high, ...medium, ...low].forEach((issue) => {
    const emoji =
      issue.severity === 'critical'
        ? '🔴'
        : issue.severity === 'high'
        ? '🟠'
        : issue.severity === 'medium'
        ? '🟡'
        : '🟢'

    console.log(`${emoji} [${issue.severity.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ''}`)
    console.log(`   ${issue.message}\n`)
  })

  // Exit with error if critical or high issues found
  if (critical.length > 0 || high.length > 0) {
    console.log('❌ Security audit failed due to critical or high severity issues\n')
    process.exit(1)
  }

  console.log('⚠️  Security audit passed with warnings\n')
}

// Run all checks
async function main() {
  console.log('\n🔒 Watch Verify Security Audit\n')
  console.log('='.repeat(60) + '\n')

  checkEnvVars()
  checkSQLInjection()
  checkRateLimiting()
  checkInputValidation()
  checkAuthentication()

  printResults()
}

main().catch((error) => {
  console.error('Error running security audit:', error)
  process.exit(1)
})
