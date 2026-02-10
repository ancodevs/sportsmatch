import { createClient } from '@/lib/supabase/client';
import { getSportName, getSurfaceName } from '@/lib/court-utils';

export interface Schedule {
  id: string;
  court_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  is_blocked: boolean;
  created_at: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getShortDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? 'N/A';
}

export async function getCourtSchedules(courtId: string): Promise<Schedule[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('court_id', courtId)
    .order('day_of_week');

  if (error) throw error;
  return (data ?? []) as Schedule[];
}

export async function getAvailableTimeSlots(
  courtId: string,
  date: string
): Promise<TimeSlot[]> {
  if (!courtId || !date) return [];

  const dayOfWeek = new Date(date).getDay();
  const supabase = createClient();

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
      slots.push({ start: startStr, end: endStr, label: `${startStr} - ${endStr}` });
    }
    current = next;
  }

  return slots;
}

export async function createWeekSchedules(
  courtId: string,
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  blockedDays: number[]
): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from('schedules')
    .delete()
    .eq('court_id', courtId);

  if (deleteError) throw deleteError;

  const rows = [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({
    court_id: courtId,
    day_of_week,
    start_time: startTime,
    end_time: endTime,
    interval_minutes: intervalMinutes,
    is_blocked: blockedDays.includes(day_of_week),
  }));

  const { error: insertError } = await supabase.from('schedules').insert(rows);

  if (insertError) throw insertError;
}

export function formatScheduleDisplay(schedule: Schedule): string {
  if (schedule.is_blocked) return 'Cerrado';
  const start = String(schedule.start_time).substring(0, 5);
  const end = String(schedule.end_time).substring(0, 5);
  return `${start} - ${end}`;
}
