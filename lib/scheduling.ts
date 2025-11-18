/**
 * Smart Scheduling System
 *
 * Handles appointment booking with intelligent slot suggestions:
 * - Prioritizes less busy time slots
 * - Respects store capacity limits
 * - Assigns salespeople via round-robin
 * - Sends WhatsApp confirmations
 */

import { atSelect, atCreate, atUpdate, buildFormula, buildAndFormula } from '@/utils/airtable'
import { logInfo, logError, logWarn } from './logger'
import { sendWhatsAppMessage } from './twilio'

// ==========================================
// Types
// ==========================================

export interface TimeSlot {
  time: string // "14:00"
  available: number // max capacity
  booked: number // current bookings
  percentage: number // booked/available * 100
}

export interface Salesperson {
  id: string
  name: string
  whatsapp: string
  maxDailyAppointments: number
  workingHours: Record<string, string> // {"mon": "9-18", ...}
  currentAppointments: number
}

export interface AppointmentBooking {
  tenantId: string
  customerPhone: string
  customerName: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  productInterest?: string
  notes?: string
}

export interface AppointmentRecord {
  id: string
  tenantId: string
  customerPhone: string
  customerName: string
  salespersonId: string
  salespersonName: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  productInterest?: string
  notes?: string
  createdAt: string
}

// ==========================================
// Slot Availability
// ==========================================

/**
 * Get available time slots for a specific date, sorted by least busy
 */
export async function getAvailableSlots(
  tenantId: string,
  date: string, // YYYY-MM-DD
  preferredTime?: string
): Promise<TimeSlot[]> {
  try {
    const dayOfWeek = new Date(date).getDay().toString()

    // Step 1: Get store availability configuration
    const availabilityRecords = await atSelect('StoreAvailability', {
      filterByFormula: buildAndFormula(
        ['tenant_id', '=', tenantId],
        ['day_of_week', '=', dayOfWeek],
        ['active', '=', 'TRUE()']
      ),
    })

    if (availabilityRecords.length === 0) {
      logWarn('scheduling', 'No availability configured for store', { tenantId, dayOfWeek })
      return []
    }

    // Step 2: Get current bookings for this date
    const appointmentRecords = await atSelect('Appointments', {
      filterByFormula: buildAndFormula(
        ['tenant_id', '=', tenantId],
        ['appointment_date', '=', date],
        ['status', '!=', 'cancelled']
      ),
    })

    // Count bookings per time slot
    const bookingsPerSlot: Record<string, number> = {}
    for (const apt of appointmentRecords) {
      const fields = apt.fields as any
      const time = fields.appointment_time
      bookingsPerSlot[time] = (bookingsPerSlot[time] || 0) + 1
    }

    // Step 3: Build slot availability array
    const slots: TimeSlot[] = []

    for (const record of availabilityRecords) {
      const fields = record.fields as any
      const time = fields.time_slot
      const maxBookings = fields.max_bookings || 5
      const booked = bookingsPerSlot[time] || 0

      // Skip if slot is full
      if (booked >= maxBookings) {
        continue
      }

      slots.push({
        time,
        available: maxBookings,
        booked,
        percentage: Math.round((booked / maxBookings) * 100),
      })
    }

    // Step 4: Sort by least busy (prioritize empty slots)
    slots.sort((a, b) => {
      // If user has a preference, prioritize it first
      if (preferredTime) {
        if (a.time === preferredTime) return -1
        if (b.time === preferredTime) return 1
      }

      // Then sort by percentage full (less busy first)
      return a.percentage - b.percentage
    })

    logInfo('scheduling', 'Retrieved available slots', {
      tenantId,
      date,
      slotsFound: slots.length,
    })

    return slots
  } catch (error: any) {
    logError('scheduling-availability', error, { tenantId, date })
    throw error
  }
}

/**
 * Check if a specific time slot is available
 */
export async function isSlotAvailable(
  tenantId: string,
  date: string,
  time: string
): Promise<boolean> {
  const slots = await getAvailableSlots(tenantId, date, time)
  const slot = slots.find((s) => s.time === time)

  if (!slot) {
    return false
  }

  return slot.booked < slot.available
}

// ==========================================
// Salesperson Assignment
// ==========================================

/**
 * Get least busy salesperson for appointment assignment (round-robin)
 */
export async function assignSalesperson(
  tenantId: string,
  date: string
): Promise<Salesperson | null> {
  try {
    // Step 1: Get active salespeople
    const salesRecords = await atSelect('Salespeople', {
      filterByFormula: buildAndFormula(
        ['tenant_id', '=', tenantId],
        ['active', '=', 'TRUE()']
      ),
    })

    if (salesRecords.length === 0) {
      logWarn('scheduling', 'No active salespeople found', { tenantId })
      return null
    }

    // Step 2: Get appointments for this date to count current load
    const appointmentRecords = await atSelect('Appointments', {
      filterByFormula: buildAndFormula(
        ['tenant_id', '=', tenantId],
        ['appointment_date', '=', date],
        ['status', '!=', 'cancelled']
      ),
    })

    // Count appointments per salesperson
    const appointmentsPerSalesperson: Record<string, number> = {}
    for (const apt of appointmentRecords) {
      const fields = apt.fields as any
      const salespersonIds = fields.salesperson_id // Array of linked records
      const salespersonId = Array.isArray(salespersonIds) ? salespersonIds[0] : salespersonIds

      if (salespersonId) {
        appointmentsPerSalesperson[salespersonId] = (appointmentsPerSalesperson[salespersonId] || 0) + 1
      }
    }

    // Step 3: Build salesperson list with current load
    const salespeople: Salesperson[] = salesRecords.map((record) => {
      const fields = record.fields as any
      const currentAppointments = appointmentsPerSalesperson[record.id] || 0

      return {
        id: record.id,
        name: fields.name,
        whatsapp: fields.whatsapp,
        maxDailyAppointments: fields.max_daily_appointments || 5,
        workingHours: fields.working_hours ? JSON.parse(fields.working_hours) : {},
        currentAppointments,
      }
    })

    // Step 4: Filter out salespeople who are at capacity
    const availableSalespeople = salespeople.filter(
      (sp) => sp.currentAppointments < sp.maxDailyAppointments
    )

    if (availableSalespeople.length === 0) {
      logWarn('scheduling', 'All salespeople at capacity', { tenantId, date })
      return null
    }

    // Step 5: Sort by least busy (round-robin)
    availableSalespeople.sort((a, b) => a.currentAppointments - b.currentAppointments)

    const assigned = availableSalespeople[0]

    logInfo('scheduling', 'Assigned salesperson', {
      salespersonId: assigned.id,
      name: assigned.name,
      currentLoad: assigned.currentAppointments,
      maxCapacity: assigned.maxDailyAppointments,
    })

    return assigned
  } catch (error: any) {
    logError('scheduling-assignment', error, { tenantId, date })
    return null
  }
}

// ==========================================
// Appointment Booking
// ==========================================

/**
 * Book an appointment (creates Airtable record + sends confirmations)
 */
export async function bookAppointment(
  booking: AppointmentBooking
): Promise<AppointmentRecord | null> {
  try {
    const { tenantId, customerPhone, customerName, date, time, productInterest, notes } = booking

    // Step 1: Verify slot is still available
    const slotAvailable = await isSlotAvailable(tenantId, date, time)
    if (!slotAvailable) {
      logWarn('scheduling', 'Slot no longer available', { tenantId, date, time })
      return null
    }

    // Step 2: Assign salesperson
    const salesperson = await assignSalesperson(tenantId, date)
    if (!salesperson) {
      logWarn('scheduling', 'No salesperson available', { tenantId, date })
      return null
    }

    // Step 3: Create appointment record
    const appointmentRecord = await atCreate('Appointments', {
      tenant_id: [tenantId],
      customer_phone: customerPhone,
      customer_name: customerName,
      salesperson_id: [salesperson.id],
      appointment_date: date,
      appointment_time: time,
      status: 'pending',
      product_interest: productInterest || '',
      notes: notes || '',
      created_at: new Date().toISOString(),
    } as any)

    const appointmentId = appointmentRecord.id

    // Step 4: Send confirmation to customer
    const customerMessage = formatCustomerConfirmation({
      customerName,
      salespersonName: salesperson.name,
      date,
      time,
      productInterest,
    })

    await sendWhatsAppMessage(customerPhone, customerMessage)

    // Step 5: Notify salesperson
    const salespersonMessage = formatSalespersonNotification({
      customerName,
      customerPhone,
      date,
      time,
      productInterest,
    })

    await sendWhatsAppMessage(salesperson.whatsapp, salespersonMessage)

    logInfo('scheduling', 'Appointment booked successfully', {
      appointmentId,
      customerPhone,
      salespersonName: salesperson.name,
      date,
      time,
    })

    return {
      id: appointmentId,
      tenantId,
      customerPhone,
      customerName,
      salespersonId: salesperson.id,
      salespersonName: salesperson.name,
      date,
      time,
      status: 'pending',
      productInterest,
      notes,
      createdAt: new Date().toISOString(),
    }
  } catch (error: any) {
    logError('scheduling-booking', error, booking)
    return null
  }
}

/**
 * Confirm appointment (update status to confirmed)
 */
export async function confirmAppointment(appointmentId: string): Promise<boolean> {
  try {
    await atUpdate('Appointments', appointmentId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    } as any)

    logInfo('scheduling', 'Appointment confirmed', { appointmentId })
    return true
  } catch (error: any) {
    logError('scheduling-confirm', error, { appointmentId })
    return false
  }
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<boolean> {
  try {
    await atUpdate('Appointments', appointmentId, {
      status: 'cancelled',
      notes: reason ? `Cancelado: ${reason}` : 'Cancelado',
    } as any)

    logInfo('scheduling', 'Appointment cancelled', { appointmentId, reason })
    return true
  } catch (error: any) {
    logError('scheduling-cancel', error, { appointmentId })
    return false
  }
}

// ==========================================
// Message Formatting
// ==========================================

function formatCustomerConfirmation(params: {
  customerName: string
  salespersonName: string
  date: string
  time: string
  productInterest?: string
}): string {
  const { customerName, salespersonName, date, time, productInterest } = params

  const dateFormatted = new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let message = `✅ *Agendamento Confirmado*\n\n`
  message += `Olá ${customerName}!\n\n`
  message += `Sua visita foi agendada com sucesso:\n\n`
  message += `📅 *Data:* ${dateFormatted}\n`
  message += `🕒 *Horário:* ${time}\n`
  message += `👤 *Atendimento com:* ${salespersonName}\n`

  if (productInterest) {
    message += `💎 *Interesse:* ${productInterest}\n`
  }

  message += `\n📍 Aguardamos você!\n\n`
  message += `_Responda "confirmar" para confirmar sua presença._`

  return message
}

function formatSalespersonNotification(params: {
  customerName: string
  customerPhone: string
  date: string
  time: string
  productInterest?: string
}): string {
  const { customerName, customerPhone, date, time, productInterest } = params

  let message = `🔔 *Novo Agendamento*\n\n`
  message += `👤 *Cliente:* ${customerName}\n`
  message += `📱 *Telefone:* ${customerPhone}\n`
  message += `📅 *Data:* ${date}\n`
  message += `🕒 *Horário:* ${time}\n`

  if (productInterest) {
    message += `💎 *Interesse:* ${productInterest}\n`
  }

  message += `\n_Cliente aguarda confirmação._`

  return message
}

// ==========================================
// Daily Reports
// ==========================================

/**
 * Get all appointments for a salesperson on a specific date
 */
export async function getSalespersonAppointments(
  salespersonId: string,
  date: string
): Promise<AppointmentRecord[]> {
  try {
    const records = await atSelect('Appointments', {
      filterByFormula: buildAndFormula(
        ['salesperson_id', '=', salespersonId],
        ['appointment_date', '=', date],
        ['status', '!=', 'cancelled']
      ),
      sort: JSON.stringify([{ field: 'appointment_time', direction: 'asc' }]),
    })

    return records.map((record) => {
      const fields = record.fields as any
      const salespersonIds = fields.salesperson_id
      const salespersonId = Array.isArray(salespersonIds) ? salespersonIds[0] : salespersonIds

      return {
        id: record.id,
        tenantId: fields.tenant_id?.[0] || '',
        customerPhone: fields.customer_phone,
        customerName: fields.customer_name,
        salespersonId,
        salespersonName: '', // Not fetched here
        date: fields.appointment_date,
        time: fields.appointment_time,
        status: fields.status,
        productInterest: fields.product_interest,
        notes: fields.notes,
        createdAt: fields.created_at,
      }
    })
  } catch (error: any) {
    logError('scheduling-appointments', error, { salespersonId, date })
    return []
  }
}

/**
 * Send daily schedule report to all salespeople
 * This should be called by a cron job every morning at 8am
 */
export async function sendDailyScheduleReports(tenantId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all active salespeople
    const salesRecords = await atSelect('Salespeople', {
      filterByFormula: buildAndFormula(
        ['tenant_id', '=', tenantId],
        ['active', '=', 'TRUE()']
      ),
    })

    let reportsSent = 0

    for (const salesRecord of salesRecords) {
      const fields = salesRecord.fields as any
      const salespersonId = salesRecord.id
      const name = fields.name
      const whatsapp = fields.whatsapp

      // Get today's appointments
      const appointments = await getSalespersonAppointments(salespersonId, today)

      // Format message
      const dateFormatted = new Date(today).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      let message = `📅 *Agenda de Hoje* (${dateFormatted})\n\n`

      if (appointments.length === 0) {
        message += `Você não tem agendamentos para hoje. 😊\n\n`
        message += `Aproveite para organizar o showroom!`
      } else {
        message += `Você tem *${appointments.length} cliente(s)* agendados:\n\n`

        appointments.forEach((apt, i) => {
          message += `${i + 1}. *${apt.time}* - ${apt.customerName}\n`
          message += `   📱 ${apt.customerPhone}\n`

          if (apt.productInterest) {
            message += `   💎 ${apt.productInterest}\n`
          }

          if (apt.notes) {
            message += `   📝 ${apt.notes}\n`
          }

          message += `\n`
        })

        message += `Boa sorte! 🎯`
      }

      // Send WhatsApp message
      await sendWhatsAppMessage(whatsapp, message)
      reportsSent++

      logInfo('scheduling-daily-report', 'Sent daily schedule', {
        salespersonId,
        name,
        appointmentCount: appointments.length,
      })
    }

    logInfo('scheduling', 'Daily schedule reports sent', {
      tenantId,
      reportsSent,
    })

    return reportsSent
  } catch (error: any) {
    logError('scheduling-daily-reports', error, { tenantId })
    return 0
  }
}
