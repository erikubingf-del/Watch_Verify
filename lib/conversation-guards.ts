import { atSelect } from '@/utils/airtable'

/**
 * Conversation Guards - Prevent AI from repeating greetings
 *
 * This module provides deterministic control over conversation flow by checking
 * message history before allowing certain actions (like sending greetings).
 */

/**
 * Check if we should send a greeting to this customer
 *
 * Returns false if:
 * - We greeted them recently (<2 hours ago)
 * - This is an active conversation (messages within 2 hours)
 *
 * Returns true if:
 * - No previous messages exist (new customer)
 * - Last message was >2 hours ago (new conversation)
 *
 * IMPORTANT: User note says "can be that after 2 hours but has a history message"
 * So if >2 hours, we should send "Hey NAME" or "Hey, welcome back" instead of full greeting.
 * We return true for >2 hours, but the caller should use different greeting logic.
 */
export async function shouldSendGreeting(
  tenantId: string,
  phone: string
): Promise<boolean> {
  const messages = await atSelect('Messages', {
    filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}', {direction}='outbound', {deleted_at}=BLANK())`,
    sort: '[{"field":"created_at","direction":"desc"}]',
    maxRecords: '1',
  })

  if (messages.length === 0) return true // No previous messages - new customer

  const lastMessage = messages[0].fields as any
  const lastTime = new Date(lastMessage.created_at).getTime()
  const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60)

  // Only greet if it's been >2 hours
  // Note: If true is returned here, caller should check if customer exists
  // and send "Hey NAME, welcome back!" instead of full introduction
  return hoursSince >= 2
}

/**
 * Get the last AI message sent to customer
 * Used to understand conversation context
 */
export async function getLastAIMessage(
  tenantId: string,
  phone: string
): Promise<string | null> {
  const messages = await atSelect('Messages', {
    filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}', {direction}='outbound', {deleted_at}=BLANK())`,
    sort: '[{"field":"created_at","direction":"desc"}]',
    maxRecords: '1',
  })

  if (messages.length === 0) return null
  return (messages[0].fields as any).body || null
}

/**
 * Check if customer has conversation history
 * Returns true if customer has received any messages before
 */
export async function hasConversationHistory(
  tenantId: string,
  phone: string
): Promise<boolean> {
  const messages = await atSelect('Messages', {
    filterByFormula: `AND({tenant_id}='${tenantId}', {phone}='${phone}', {direction}='outbound', {deleted_at}=BLANK())`,
    sort: '[{"field":"created_at","direction":"desc"}]',
    maxRecords: '1',
  })

  return messages.length > 0
}
