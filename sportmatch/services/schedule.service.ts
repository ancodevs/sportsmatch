import { supabase } from './supabase';

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  a1: string,
  a2: string,
  b1: string,
  b2: string
): boolean {
  const a1Min = parseTimeToMinutes(a1);
  const a2Min = parseTimeToMinutes(a2);
  const b1Min = parseTimeToMinutes(b1);
  const b2Min = parseTimeToMinutes(b2);
  
  // Se solapan si: inicio_A < fin_B Y inicio_B < fin_A
  // Usamos < (no <=) para que los rangos sean semi-abiertos [start, end)
  return a1Min < b2Min && b1Min < a2Min;
}

/**
 * Obtiene los slots disponibles para una cancha en una fecha,
 * según la gestión de horarios del admin (schedules) y restando
 * los ya ocupados por reservas (bookings).
 */
export async function getAvailableSlotsForCourt(
  courtId: string,
  date: string
): Promise<TimeSlot[]> {
  if (!courtId || !date) return [];

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('court_id', courtId)
    .eq('day_of_week', dayOfWeek)
    .single();

  if (error || !schedule || schedule.is_blocked) return [];

  const [startHour, startMin] = String(schedule.start_time)
    .substring(0, 5)
    .split(':')
    .map(Number);
  const [endHour, endMin] = String(schedule.end_time)
    .substring(0, 5)
    .split(':')
    .map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const interval = schedule.interval_minutes ?? 60;

  const slots: TimeSlot[] = [];
  let current = startMinutes;

  while (current < endMinutes) {
    const next = current + interval;
    if (next <= endMinutes) {
      const startStr = formatMinutesToTime(current);
      const endStr = formatMinutesToTime(next);
      slots.push({
        start: startStr,
        end: endStr,
        label: `${startStr} - ${endStr}`,
      });
    }
    current = next;
  }

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled');

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
