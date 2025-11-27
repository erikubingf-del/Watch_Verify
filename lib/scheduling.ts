/**
 * Smart Scheduling System
 *
 * Handles appointment booking with intelligent slot suggestions:
 * - Prioritizes less busy time slots
 * - Respects store capacity limits
 * - Assigns salespeople via round-robin
 * - Sends WhatsApp confirmations
 */

import { prisma } from '@/lib/prisma'
import { logInfo, logError, logWarn } from './logger'
import { sendWhatsAppMessage } from './twilio'
import { AppointmentStatus, UserRole } from '@prisma/client'

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
  status: string
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
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay() // 0-6

    // Step 1: Get store availability configuration
    const availabilityRecords = await prisma.storeAvailability.findMany({
      where: {
        tenantId,
        dayOfWeek,
        isActive: true,
      },
    })

    if (availabilityRecords.length === 0) {
      logWarn('scheduling', 'No availability configured for store', { tenantId, dayOfWeek })
      return []
    }

    // Step 2: Get current bookings for this date
    // We need to query appointments where scheduledAt falls on this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    })

    // Count bookings per time slot
    const bookingsPerSlot: Record<string, number> = {}

    for (const apt of appointments) {
      const time = apt.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      bookingsPerSlot[time] = (bookingsPerSlot[time] || 0) + 1
    }

    // Step 3: Build slot availability array
    const slots: TimeSlot[] = []

    for (const record of availabilityRecords) {
      const time = record.timeSlot
      const maxBookings = record.maxBookings || 5
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
    const salespeople = await prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.SALESPERSON,
        isActive: true,
      },
    })

    if (salespeople.length === 0) {
      logWarn('scheduling', 'No active salespeople found', { tenantId })
      return null
    }

    // Step 2: Get appointments for this date to count current load
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    })

    // Count appointments per salesperson
    const appointmentsPerSalesperson: Record<string, number> = {}
    for (const apt of appointments) {
      appointmentsPerSalesperson[apt.salespersonId] = (appointmentsPerSalesperson[apt.salespersonId] || 0) + 1
    }

    // Step 3: Build salesperson list with current load
    const salespersonList: Salesperson[] = salespeople.map((sp: any) => {
      const currentAppointments = appointmentsPerSalesperson[sp.id] || 0

      // Note: workingHours and maxDailyAppointments are not currently in User model
      // We'll use defaults for now or assume they might be in a future 'config' field
      // For now, hardcoding defaults

      return {
        id: sp.id,
        name: sp.name,
        whatsapp: sp.whatsapp || '',
        maxDailyAppointments: 5, // Default
        workingHours: {}, // Default
        currentAppointments,
      }
    })

    // Step 4: Filter out salespeople who are at capacity
    const availableSalespeople = salespersonList.filter(
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
 * Book an appointment (creates Prisma record + sends confirmations)
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

    // Step 2: Create or update customer record
    // We use upsert to ensure customer exists
    const customer = await prisma.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId,
          phone: customerPhone,
        },
      },
      update: {
        name: customerName,
        lastInteraction: new Date(),
        // We'd ideally append to tags/interests here, but Prisma update is simple replacement or set
        // For simplicity, we'll just update name and lastInteraction
      },
      create: {
        tenantId,
        phone: customerPhone,
        name: customerName,
        profile: productInterest ? { interests: [productInterest] } : {},
      },
    })

    // Step 3: Assign salesperson
    const salesperson = await assignSalesperson(tenantId, date)
    if (!salesperson) {
      logWarn('scheduling', 'No salesperson available', { tenantId, date })
      return null
    }

    // Step 4: Create appointment record
    // Construct DateTime from date and time strings
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(hours, minutes, 0, 0)

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        customerId: customer.id,
        salespersonId: salesperson.id,
        scheduledAt,
        status: AppointmentStatus.PENDING,
        notes: notes || productInterest ? `Interest: ${productInterest}` : undefined,
      },
      include: {
        salesperson: true,
        customer: true,
      }
    })

    // Step 5: Send confirmation to customer
    const customerMessage = formatCustomerConfirmation({
      customerName,
      salespersonName: salesperson.name,
      date,
      time,
      productInterest,
    })

    await sendWhatsAppMessage(customerPhone, customerMessage)

    // Step 6: Notify salesperson
    const salespersonMessage = formatSalespersonNotification({
      customerName,
      customerPhone,
      date,
      time,
      productInterest,
    })

    if (salesperson.whatsapp) {
      await sendWhatsAppMessage(salesperson.whatsapp, salespersonMessage)
    }

    logInfo('scheduling', 'Appointment booked successfully', {
      appointmentId: appointment.id,
      customerPhone,
      salespersonName: salesperson.name,
      date,
      time,
    })

    return {
      id: appointment.id,
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
      createdAt: appointment.createdAt.toISOString(),
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
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CONFIRMED,
      },
    })

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
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : undefined, // Appending would be better but simple update for now
      },
    })

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
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        salespersonId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        customer: true,
      }
    })

    return appointments.map((apt: any) => {
      const time = apt.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      return {
        id: apt.id,
        tenantId: apt.tenantId,
        customerPhone: apt.customer.phone,
        customerName: apt.customer.name || 'Cliente',
        salespersonId: apt.salespersonId,
        salespersonName: '', // Not fetched here to avoid extra join if not needed
        date: date,
        time: time,
        status: apt.status.toLowerCase(),
        productInterest: apt.notes, // Using notes as proxy for interest if structured field missing
        notes: apt.notes,
        createdAt: apt.createdAt.toISOString(),
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
    const today = new Date()
    const dateString = today.toISOString().split('T')[0]

    // Get all active salespeople
    const salespeople = await prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.SALESPERSON,
        isActive: true,
      },
    })

    let reportsSent = 0

    for (const salesperson of salespeople) {
      if (!salesperson.whatsapp) continue

      // Get today's appointments
      const appointments = await getSalespersonAppointments(salesperson.id, dateString)

      // Format message
      const dateFormatted = today.toLocaleDateString('pt-BR', {
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
      await sendWhatsAppMessage(salesperson.whatsapp, message)
      reportsSent++

      logInfo('scheduling-daily-report', 'Sent daily schedule', {
        salespersonId: salesperson.id,
        name: salesperson.name,
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
