/**
 * Conversation Quality Analysis Script
 * Analyzes Messages table from Airtable to identify quality issues
 */

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!

interface Message {
  id: string
  fields: {
    body?: string
    phone?: string
    direction?: 'inbound' | 'outbound'
    created_at?: string
    deleted_at?: string
    tenant_id?: string
  }
}

interface ConversationThread {
  phone: string
  messages: Message[]
  issues: string[]
  qualityScore: number
}

interface AnalysisResult {
  totalMessages: number
  totalConversations: number
  overallHealth: string
  conversations: ConversationThread[]
  criticalIssues: string[]
  recommendations: string[]
}

async function fetchMessages(): Promise<Message[]> {
  console.log('Fetching messages from Airtable...')

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Messages`
  const params = new URLSearchParams({
    filterByFormula: 'deleted_at=BLANK()',
    maxRecords: '100',
    sort: '[{field: "created_at", direction: "desc"}]',
  })

  const response = await fetch(`${url}?${params}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Airtable API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.records || []
}

function groupByPhone(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>()

  for (const msg of messages) {
    const phone = msg.fields.phone || 'unknown'
    if (!groups.has(phone)) {
      groups.set(phone, [])
    }
    groups.get(phone)!.push(msg)
  }

  return groups
}

function analyzeConversation(phone: string, messages: Message[]): ConversationThread {
  const issues: string[] = []
  let qualityScore = 100

  // Sort messages by created_at
  const sorted = messages.sort((a, b) => {
    const dateA = a.fields.created_at ? new Date(a.fields.created_at).getTime() : 0
    const dateB = b.fields.created_at ? new Date(b.fields.created_at).getTime() : 0
    return dateA - dateB
  })

  // Get outbound messages (AI responses)
  const outbound = sorted.filter(m => m.fields.direction === 'outbound')
  const inbound = sorted.filter(m => m.fields.direction === 'inbound')

  // Issue 1: Repetitive greetings
  const greetingPattern = /ol[aá]!?\s+(somos|sou)/i
  const greetingMessages = outbound.filter(m =>
    m.fields.body && greetingPattern.test(m.fields.body)
  )

  if (greetingMessages.length > 2) {
    issues.push(`REPETITIVE_GREETINGS: AI sent greeting ${greetingMessages.length} times in same conversation`)
    qualityScore -= 30
  }

  // Issue 2: Context loss - asking same questions
  const questionPatterns = [
    /qual (?:é )?o seu nome/i,
    /pode (?:me )?informar seu nome/i,
    /como posso te chamar/i,
    /qual.*seu.*(?:email|telefone|whatsapp)/i,
  ]

  for (const pattern of questionPatterns) {
    const asks = outbound.filter(m => m.fields.body && pattern.test(m.fields.body))
    if (asks.length > 1) {
      issues.push(`CONTEXT_LOSS: AI asked same question ${asks.length} times`)
      qualityScore -= 25
    }
  }

  // Issue 3: No response to customer messages
  if (inbound.length > 0 && outbound.length === 0) {
    issues.push(`NO_RESPONSE: Customer sent ${inbound.length} messages with no AI response`)
    qualityScore -= 50
  }

  // Issue 4: Conversation restart loops
  const timeGaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].fields.created_at
    const curr = sorted[i].fields.created_at
    if (prev && curr) {
      const gap = new Date(curr).getTime() - new Date(prev).getTime()
      timeGaps.push(gap / 1000 / 60) // minutes
    }
  }

  const shortGaps = timeGaps.filter(g => g < 1) // Less than 1 minute
  if (shortGaps.length > 5 && greetingMessages.length > 1) {
    issues.push(`RESTART_LOOP: Rapid message exchange (${shortGaps.length} messages in <1min) with multiple greetings`)
    qualityScore -= 20
  }

  // Issue 5: Empty or malformed messages
  const emptyMessages = sorted.filter(m => !m.fields.body || m.fields.body.trim().length === 0)
  if (emptyMessages.length > 0) {
    issues.push(`EMPTY_MESSAGES: Found ${emptyMessages.length} messages with no body`)
    qualityScore -= 15
  }

  // Issue 6: Excessive message length
  const longMessages = outbound.filter(m => m.fields.body && m.fields.body.length > 1000)
  if (longMessages.length > 0) {
    issues.push(`EXCESSIVE_LENGTH: ${longMessages.length} AI messages exceed 1000 chars (bad UX on WhatsApp)`)
    qualityScore -= 10
  }

  // Issue 7: Low engagement ratio
  if (inbound.length > 0) {
    const ratio = outbound.length / inbound.length
    if (ratio > 3) {
      issues.push(`LOW_ENGAGEMENT: AI sent ${ratio.toFixed(1)}x more messages than customer (pushy behavior)`)
      qualityScore -= 15
    }
  }

  return {
    phone,
    messages: sorted,
    issues,
    qualityScore: Math.max(0, qualityScore),
  }
}

function generateRecommendations(conversations: ConversationThread[]): string[] {
  const recommendations: string[] = []
  const allIssues = conversations.flatMap(c => c.issues)

  // Check for repetitive greeting issues
  const greetingIssues = allIssues.filter(i => i.startsWith('REPETITIVE_GREETINGS'))
  if (greetingIssues.length > 0) {
    recommendations.push(
      '🔴 CRITICAL: Fix greeting repetition in /app/api/webhooks/twilio/route.ts\n' +
      '   - Check if conversation history is being properly loaded\n' +
      '   - Verify session state management (customer_id lookup)\n' +
      '   - Add greeting detection: skip if last outbound contains greeting pattern'
    )
  }

  // Check for context loss
  const contextIssues = allIssues.filter(i => i.startsWith('CONTEXT_LOSS'))
  if (contextIssues.length > 0) {
    recommendations.push(
      '🔴 CRITICAL: Context loss detected - conversation history not being used\n' +
      '   - Verify AI prompt includes recent message history\n' +
      '   - Check lib/rag.ts or AI responder logic\n' +
      '   - Ensure customer data is being retrieved and passed to AI'
    )
  }

  // Check for no response issues
  const noResponseIssues = allIssues.filter(i => i.startsWith('NO_RESPONSE'))
  if (noResponseIssues.length > 0) {
    recommendations.push(
      '🟡 HIGH: Customer messages not receiving responses\n' +
      '   - Check webhook endpoint is properly configured\n' +
      '   - Verify Twilio signature validation isn\'t failing\n' +
      '   - Add error logging to /app/api/webhooks/twilio/route.ts'
    )
  }

  // Check for restart loops
  const loopIssues = allIssues.filter(i => i.startsWith('RESTART_LOOP'))
  if (loopIssues.length > 0) {
    recommendations.push(
      '🟡 HIGH: Conversation restart loops detected\n' +
      '   - Implement session persistence (BookingSessions, VerificationSessions)\n' +
      '   - Add conversation state tracking in Messages table\n' +
      '   - Use last_interaction timestamp to detect ongoing conversations'
    )
  }

  // Check for empty messages
  const emptyIssues = allIssues.filter(i => i.startsWith('EMPTY_MESSAGES'))
  if (emptyIssues.length > 0) {
    recommendations.push(
      '🟢 MEDIUM: Empty messages being stored\n' +
      '   - Add validation in message creation logic\n' +
      '   - Check if media messages are being handled correctly\n' +
      '   - Ensure webhook payload parsing handles all message types'
    )
  }

  // Check for excessive length
  const lengthIssues = allIssues.filter(i => i.startsWith('EXCESSIVE_LENGTH'))
  if (lengthIssues.length > 0) {
    recommendations.push(
      '🟢 MEDIUM: AI responses too long for WhatsApp UX\n' +
      '   - Update AI system prompt: "Keep responses under 300 characters"\n' +
      '   - Split long responses into multiple messages\n' +
      '   - Use bullet points and concise language'
    )
  }

  // Check for low engagement
  const engagementIssues = allIssues.filter(i => i.startsWith('LOW_ENGAGEMENT'))
  if (engagementIssues.length > 0) {
    recommendations.push(
      '🟢 LOW: AI sending too many messages (pushy behavior)\n' +
      '   - Review AI prompt: emphasize brevity and waiting for customer response\n' +
      '   - Add message frequency limits (max 2-3 messages before customer replies)\n' +
      '   - Implement "patience" logic in conversation flow'
    )
  }

  return recommendations
}

async function analyzeConversations(): Promise<AnalysisResult> {
  const messages = await fetchMessages()
  console.log(`\nFetched ${messages.length} messages`)

  const grouped = groupByPhone(messages)
  console.log(`Found ${grouped.size} unique phone numbers\n`)

  const conversations: ConversationThread[] = []
  for (const [phone, msgs] of grouped) {
    conversations.push(analyzeConversation(phone, msgs))
  }

  // Sort by quality score (worst first)
  conversations.sort((a, b) => a.qualityScore - b.qualityScore)

  const avgScore = conversations.reduce((sum, c) => sum + c.qualityScore, 0) / conversations.length
  const criticalConvos = conversations.filter(c => c.qualityScore < 50)

  let overallHealth = 'EXCELLENT'
  if (avgScore < 90) overallHealth = 'GOOD'
  if (avgScore < 70) overallHealth = 'FAIR'
  if (avgScore < 50) overallHealth = 'POOR'
  if (avgScore < 30) overallHealth = 'CRITICAL'

  const criticalIssues: string[] = []
  if (criticalConvos.length > conversations.length * 0.3) {
    criticalIssues.push(`${criticalConvos.length}/${conversations.length} conversations have quality score < 50`)
  }

  return {
    totalMessages: messages.length,
    totalConversations: conversations.length,
    overallHealth,
    conversations,
    criticalIssues,
    recommendations: generateRecommendations(conversations),
  }
}

async function main() {
  console.log('🔍 Watch Verify - Conversation Quality Analysis\n')
  console.log('=' .repeat(60))

  try {
    const result = await analyzeConversations()

    // Print summary
    console.log('\n📊 OVERALL SYSTEM HEALTH')
    console.log('=' .repeat(60))
    console.log(`Status: ${result.overallHealth}`)
    console.log(`Total Messages: ${result.totalMessages}`)
    console.log(`Total Conversations: ${result.totalConversations}`)
    console.log(`Average Quality Score: ${(result.conversations.reduce((s, c) => s + c.qualityScore, 0) / result.conversations.length).toFixed(1)}%`)

    if (result.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES')
      console.log('=' .repeat(60))
      result.criticalIssues.forEach(issue => console.log(`  - ${issue}`))
    }

    // Print worst conversations
    console.log('\n🔴 WORST PERFORMING CONVERSATIONS (Top 10)')
    console.log('=' .repeat(60))
    result.conversations.slice(0, 10).forEach((conv, i) => {
      console.log(`\n${i + 1}. Phone: ${conv.phone}`)
      console.log(`   Quality Score: ${conv.qualityScore}%`)
      console.log(`   Messages: ${conv.messages.length} total (${conv.messages.filter(m => m.fields.direction === 'outbound').length} AI, ${conv.messages.filter(m => m.fields.direction === 'inbound').length} customer)`)
      console.log(`   Issues:`)
      conv.issues.forEach(issue => console.log(`     - ${issue}`))

      // Show sample messages
      const outbound = conv.messages.filter(m => m.fields.direction === 'outbound')
      if (outbound.length > 0) {
        console.log(`   Sample AI messages:`)
        outbound.slice(0, 3).forEach(msg => {
          const preview = msg.fields.body?.substring(0, 100).replace(/\n/g, ' ') || '[empty]'
          console.log(`     "${preview}..."`)
        })
      }
    })

    // Print recommendations
    console.log('\n\n💡 ACTIONABLE RECOMMENDATIONS')
    console.log('=' .repeat(60))
    result.recommendations.forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec}`)
    })

    // Full conversation examples for worst 3
    console.log('\n\n📝 DETAILED CONVERSATION EXAMPLES (Worst 3)')
    console.log('=' .repeat(60))
    result.conversations.slice(0, 3).forEach((conv, i) => {
      console.log(`\n\nConversation ${i + 1}: ${conv.phone}`)
      console.log('-'.repeat(60))
      conv.messages.forEach(msg => {
        const time = msg.fields.created_at ? new Date(msg.fields.created_at).toLocaleString() : 'unknown'
        const direction = msg.fields.direction === 'outbound' ? '🤖 AI' : '👤 Customer'
        const body = msg.fields.body || '[empty]'
        console.log(`\n[${time}] ${direction}:`)
        console.log(body)
      })
    })

  } catch (error) {
    console.error('❌ Analysis failed:', error)
    throw error
  }
}

main()
