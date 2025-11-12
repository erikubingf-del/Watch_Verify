/**
 * Structured logging utilities
 * Provides consistent error tracking and monitoring
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  data?: any
  stack?: string
}

/**
 * Log a structured message
 */
export function log(level: LogLevel, context: string, message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...(data && { data }),
  }

  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log

  if (process.env.NODE_ENV === 'production') {
    // In production, output as JSON for log aggregation
    logFn(JSON.stringify(entry))
  } else {
    // In development, output human-readable format
    const prefix = `[${level.toUpperCase()}] ${context}:`
    logFn(prefix, message, data || '')
  }
}

/**
 * Log an error with full stack trace
 */
export function logError(context: string, error: Error | any, metadata?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    message: error?.message || String(error),
    data: metadata,
    stack: error?.stack,
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(entry))

    // TODO: Send to error tracking service (Sentry, etc.)
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(error, { tags: { context }, extra: metadata })
    // }
  } else {
    console.error(`[ERROR] ${context}:`, error.message)
    if (metadata) console.error('Metadata:', metadata)
    if (error.stack) console.error(error.stack)
  }
}

/**
 * Log info message
 */
export function logInfo(context: string, message: string, data?: any) {
  log('info', context, message, data)
}

/**
 * Log warning
 */
export function logWarn(context: string, message: string, data?: any) {
  log('warn', context, message, data)
}

/**
 * Log debug message (only in development)
 */
export function logDebug(context: string, message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    log('debug', context, message, data)
  }
}

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number
  private context: string

  constructor(context: string) {
    this.context = context
    this.startTime = Date.now()
  }

  end(label: string) {
    const duration = Date.now() - this.startTime
    logDebug(this.context, `${label} took ${duration}ms`)
    return duration
  }
}
