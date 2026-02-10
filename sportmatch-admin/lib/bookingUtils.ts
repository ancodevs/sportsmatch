import { createClient } from '@/lib/supabase/client';
import { getAvailableTimeSlots, TimeSlot } from './scheduleUtils';

export interface Booking {
  id: string;
  court_id: string;
  player_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string | null;
  created_at: string;
  updated_at: string;
  courts?: { name: string; sport_type: string } | null;
  profiles?: { first_name: string; last_name: string; email?: string; telefono?: string } | null;
}

export interface BookingFormData {
  court_id: string;
  player_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = String(time).substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica si dos rangos de tiempo se solapan.
 * Los rangos son semi-abiertos: [start, end)
 * Ejemplo: 13:00-14:00 significa 13:00:00 hasta 13:59:59
 * Por lo tanto, 13:00-14:00 y 14:00-15:00 NO se solapan.
 */
function slotsOverlap(
  a1: string, a2: string,
  b1: string, b2: string
): boolean {
  const a1Min = parseTimeToMinutes(a1);
  const a2Min = parseTimeToMinutes(a2);
  const b1Min = parseTimeToMinutes(b1);
  const b2Min = parseTimeToMinutes(b2);
  
  // Se solapan si: inicio_A < fin_B Y inicio_B < fin_A
  // Usamos < (no <=) para que los rangos sean semi-abiertos [start, end)
  return a1Min < b2Min && b1Min < a2Min;
}

export async function checkAvailability(
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ isAvailable: boolean; conflictingBookings: any[] }> {
  const supabase = createClient();

  let query = supabase
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data: existingBookings } = await query;

  const conflicting = (existingBookings || []).filter((b) =>
    slotsOverlap(
      startTime,
      endTime,
      String(b.start_time).substring(0, 5),
      String(b.end_time).substring(0, 5)
    )
  );

  return { isAvailable: conflicting.length === 0, conflictingBookings: conflicting };
}

export async function getAvailableSlotsForReservation(
  courtId: string,
  date: string,
  excludeBookingId?: string
): Promise<TimeSlot[]> {
  const slots = await getAvailableTimeSlots(courtId, date);
  if (slots.length === 0) return [];

  const supabase = createClient();
  let query = supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data: existingBookings } = await query;

  return slots.filter((slot) => {
    const hasConflict = (existingBookings || []).some((b) =>
      slotsOverlap(
        slot.start,
        slot.end,
        String(b.start_time).substring(0, 5),
        String(b.end_time).substring(0, 5)
      )
    );
    return !hasConflict;
  });
}

function calculateDurationHours(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return Math.max(0, (end - start) / 60);
}

export async function createBooking(data: BookingFormData): Promise<{ data: Booking | null; error: any }> {
  const supabase = createClient();

  const { isAvailable } = await checkAvailability(
    data.court_id,
    data.booking_date,
    data.start_time,
    data.end_time
  );

  if (!isAvailable) {
    return { data: null, error: new Error('Ya existe una reserva en este horario') };
  }

  const { data: court } = await supabase
    .from('courts')
    .select('day_price, night_price')
    .eq('id', data.court_id)
    .single();

  if (!court) {
    return { data: null, error: new Error('Cancha no encontrada') };
  }

  // Determinar si es horario diurno o nocturno
  // Diurno: 10:00 - 17:59 (600-1079 minutos)
  // Nocturno: 18:00 en adelante, o antes de 10:00 (>= 1080 o < 600)
  const startMinutes = parseTimeToMinutes(data.start_time);
  const dayStartMinutes = 10 * 60; // 10:00
  const nightStartMinutes = 18 * 60; // 18:00
  const isNightTime = startMinutes >= nightStartMinutes || startMinutes < dayStartMinutes;

  const pricePerHour = isNightTime ? Number(court.night_price) : Number(court.day_price);
  const durationHours = calculateDurationHours(data.start_time, data.end_time);
  const totalPrice = pricePerHour * durationHours;

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      court_id: data.court_id,
      player_id: data.player_id,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      total_price: Math.round(totalPrice),
      status: data.status ?? 'pending',
      payment_status: 'pending',
      notes: data.notes || null,
    })
    .select('*, courts(name, sport_type), profiles(first_name, last_name, email, telefono)')
    .single();

  return { data: booking as Booking, error };
}

export async function updateBooking(
  id: string,
  data: Partial<BookingFormData>
): Promise<{ data: Booking | null; error: any }> {
  const supabase = createClient();

  if (data.court_id && data.booking_date && data.start_time && data.end_time) {
    const { isAvailable } = await checkAvailability(
      data.court_id,
      data.booking_date,
      data.start_time,
      data.end_time,
      id
    );

    if (!isAvailable) {
      return { data: null, error: new Error('Ya existe una reserva en este horario') };
    }

    const { data: court } = await supabase
      .from('courts')
      .select('day_price, night_price')
      .eq('id', data.court_id)
      .single();

    if (court && data.start_time && data.end_time) {
      // Determinar si es horario diurno o nocturno
      // Diurno: 10:00 - 17:59 (600-1079 minutos)
      // Nocturno: 18:00 en adelante, o antes de 10:00 (>= 1080 o < 600)
      const startMinutes = parseTimeToMinutes(data.start_time);
      const dayStartMinutes = 10 * 60; // 10:00
      const nightStartMinutes = 18 * 60; // 18:00
      const isNightTime = startMinutes >= nightStartMinutes || startMinutes < dayStartMinutes;

      const pricePerHour = isNightTime ? Number(court.night_price) : Number(court.day_price);
      const durationHours = calculateDurationHours(data.start_time, data.end_time);
      (data as any).total_price = Math.round(pricePerHour * durationHours);
    }
  }

  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', id)
    .select('*, courts(name, sport_type), profiles(first_name, last_name, email, telefono)')
    .single();

  return { data: booking as Booking, error };
}

export async function deleteBooking(id: string): Promise<{ error: any }> {
  const supabase = createClient();
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  return { error };
}

export async function updateBookingStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
): Promise<{ error: any }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}
