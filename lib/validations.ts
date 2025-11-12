import { z } from 'zod'

/**
 * Validation schemas for Watch Verify API routes
 * Using Zod for runtime type checking and validation
 */

// Phone number validation (Brazilian format)
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
)

// Customer schema
export const customerSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  last_interest: z.string().max(200).optional(),
})

// Watch verification schema
export const watchVerifySchema = z.object({
  customer: z.string().min(2).max(100),
  phone: phoneSchema,
  brand: z.string().min(2).max(50),
  model: z.string().min(1).max(100).optional(),
  reference: z.string().max(50).optional(),
  serial: z.string().max(50).optional(),
  photo_url: z.string().url().optional(),
  guarantee_url: z.string().url().optional(),
  invoice_url: z.string().url().optional(),
})

// Settings update schema
export const settingsSchema = z.object({
  action: z.literal('save_settings'),
  table: z.string().default('Settings'),
  id: z.string().optional(),
  fields: z.object({
    brand: z.string().min(2).max(100).optional(),
    logo: z.string().url().optional(),
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
    welcome_message: z.string().max(500).optional(),
    business_hours: z.string().max(200).optional(),
  }),
})

// Delete customer schema
export const deleteCustomerSchema = z.object({
  phone: phoneSchema,
})

// AI responder schema
export const aiResponderSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1),
    })
  ).min(1),
  tenantId: z.string().optional(),
  customerPhone: phoneSchema.optional(),
})

// Index/embedding schema
export const indexSchema = z.object({
  tenant_id: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().optional(),
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
})

// Alert schema
export const alertSchema = z.object({
  customer: z.string().optional(),
  phone: phoneSchema.optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  icd: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
})

/**
 * Validation helper function
 * Validates data against a schema and returns typed result
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  error: string
} {
  try {
    const parsed = schema.parse(data)
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: messages }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Sanitize string for Airtable formula injection prevention
 */
export function sanitizeForFormula(value: string): string {
  return value.replace(/'/g, "\\'").replace(/"/g, '\\"')
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(identifier: string, route: string): string {
  return `ratelimit:${route}:${identifier}`
}
