/**
 * Servicio para "Mis Partidos" - integra sportmatch (app) con sportmatch-admin
 * Obtiene tanto partidos (matches) como reservas (bookings) del usuario actual
 */

import { supabase } from './supabase';

export interface Match {
  id: string;
  title: string;
  description: string | null;
  datetime: string;
  max_players: number;
  match_type: string;
  game_mode: string;
  price: number;
  status: string;
  created_by: string;
  court_id: string | null;
  courts?: { name: string; sport_type: string } | null;
}

export interface Booking {
  id: string;
  court_id: string;
  player_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  payment_status: string;
  notes: string | null;
  courts?: { name: string; sport_type: string } | null;
}

/**
 * Obtiene los partidos donde el usuario es organizador o participante
 */
export async function getMyMatches(userId: string): Promise<Match[]> {
  const { data: matchIds } = await supabase
    .from('match_players')
    .select('match_id')
    .eq('player_id', userId);

  const ids = (matchIds || []).map((m) => m.match_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('matches')
    .select('*, courts(name, sport_type)')
    .in('id', ids)
    .order('datetime', { ascending: false });

  if (error) throw error;
  return (data || []) as Match[];
}

/**
 * Obtiene las reservas de cancha del usuario (creadas en sportmatch-admin)
 */
export async function getMyBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(name, sport_type)')
    .eq('player_id', userId)
    .neq('status', 'cancelled')
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data || []) as Booking[];
}
