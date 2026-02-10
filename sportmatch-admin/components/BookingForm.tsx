'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  createBooking,
  updateBooking,
  getAvailableSlotsForReservation,
  type BookingFormData,
  type Booking,
} from '@/lib/bookingUtils';
import { getSportName } from '@/lib/court-utils';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telefono: string | null;
}

interface Court {
  id: string;
  name: string;
  sport_type?: string | null;
  day_price?: number;
  night_price?: number;
}

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  courts: Court[];
  editingBooking?: Booking | null;
}

const PHONE_PREFIX = '+569';
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Completada' },
] as const;

function formatPhoneForDisplay(telefono: string | null | undefined): string {
  if (!telefono) return '';
  const digits = telefono.replace(/\D/g, '').slice(-8);
  return digits;
}

export default function BookingForm({
  isOpen,
  onClose,
  onSaved,
  courts,
  editingBooking,
}: BookingFormProps) {
  const [courtId, setCourtId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [run, setRun] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled' | 'completed'>('pending');
  const [notes, setNotes] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [slots, setSlots] = useState<{ start: string; end: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingBooking;
  const selectedCourt = courts.find((c) => c.id === courtId);
  
  // Determinar si es horario diurno o nocturno
  // Diurno: 10:00 - 17:59 (600-1079 minutos)
  // Nocturno: 18:00 en adelante, o antes de 10:00 (>= 1080 o < 600)
  const parseTimeToMinutes = (time: string): number => {
    const [h, m] = String(time).substring(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  const startMinutes = startTime ? parseTimeToMinutes(startTime) : 0;
  const dayStartMinutes = 10 * 60; // 10:00
  const nightStartMinutes = 18 * 60; // 18:00
  const isNightTime = startMinutes >= nightStartMinutes || startMinutes < dayStartMinutes;
  const pricePerHour = isNightTime 
    ? Number(selectedCourt?.night_price ?? 0) 
    : Number(selectedCourt?.day_price ?? 0);

  useEffect(() => {
    if (isOpen) {
      setLoadingProfiles(true);
      const supabase = createClient();
      void (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, telefono')
            .limit(300);
          setProfiles((data ?? []) as Profile[]);
        } finally {
          setLoadingProfiles(false);
        }
      })();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editingBooking) {
      setCourtId(editingBooking.court_id);
      setPlayerId(editingBooking.player_id);
      setBookingDate(editingBooking.booking_date);
      setStartTime(String(editingBooking.start_time).substring(0, 5));
      setStatus((editingBooking.status as any) ?? 'pending');
      setNotes(editingBooking.notes || '');
      const p = editingBooking.profiles;
      if (p) {
        setFirstName(p.first_name ?? '');
        setLastName(p.last_name ?? '');
        setPhoneDigits(formatPhoneForDisplay(p.telefono));
      }
    } else if (isOpen && !editingBooking) {
      setCourtId(courts[0]?.id ?? '');
      setPlayerId('');
      setRun('');
      setFirstName('');
      setLastName('');
      setPhoneDigits('');
      setBookingDate('');
      setStartTime('');
      setStatus('pending');
      setNotes('');
    }
  }, [isOpen, editingBooking, courts]);

  useEffect(() => {
    if (!courtId || !bookingDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    
    getAvailableSlotsForReservation(courtId, bookingDate, editingBooking?.id)
      .then((slotsData) => {
        setSlots(slotsData);
        setLoadingSlots(false);
      })
      .catch(() => {
        setSlots([]);
        setLoadingSlots(false);
      });
  }, [courtId, bookingDate, editingBooking?.id]);

  useEffect(() => {
    const p = profiles.find((x) => x.id === playerId);
    if (p) {
      setFirstName(p.first_name ?? '');
      setLastName(p.last_name ?? '');
      setPhoneDigits(formatPhoneForDisplay(p.telefono));
    }
  }, [playerId, profiles]);

  const filteredProfiles = profiles.filter((p) => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const selectedSlot = slots.find((s) => s.start === startTime);
  const endTime = selectedSlot?.end ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtId || !playerId || !bookingDate || !startTime || !endTime) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const data: BookingFormData = {
        court_id: courtId,
        player_id: playerId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes || undefined,
        status,
      };

      if (isEditing) {
        const { data: updated, error } = await updateBooking(editingBooking.id, data);
        if (error) throw error;
        toast.success('Reserva actualizada correctamente');
      } else {
        const { data: created, error } = await createBooking(data);
        if (error) throw error;
        toast.success('Reserva creada correctamente');
      }
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la reserva');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Editar Reserva' : 'Nueva Reserva'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Cancha * */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancha *
              </label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 pl-3 pr-8"
              >
                <option value="">Seleccionar cancha</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {getSportName(c.sport_type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Jugador * (al seleccionar se rellenan RUN, Nombre, Apellido, Teléfono) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jugador *
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2 px-3 mb-2"
              />
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 pl-3 pr-8"
              >
                <option value="">Seleccionar jugador</option>
                {filteredProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.email ? ` (${p.email})` : ''}
                  </option>
                ))}
              </select>
              {loadingProfiles && (
                <p className="text-xs text-gray-500 mt-1">Cargando jugadores...</p>
              )}
            </div>

            {/* RUN * */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RUN *
              </label>
              <input
                type="text"
                placeholder="Ej: 19283325-6"
                value={run}
                onChange={(e) => setRun(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 px-3"
              />
            </div>

            {/* Nombre * y Apellido * */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 px-3"
                />
              </div>
            </div>

            {/* Teléfono * */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 text-sm border-r border-gray-300">
                  {PHONE_PREFIX}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="87654321"
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  className="flex-1 py-2.5 px-3 text-gray-900 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ingresa 8 dígitos (sin el +569)
              </p>
            </div>

            {/* Fecha de Reserva * */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Reserva *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 pl-10 pr-3"
                />
              </div>
            </div>

            {/* Horario de Reserva * - grid de botones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horario de Reserva *
              </label>
              {loadingSlots ? (
                <p className="text-sm text-gray-500 py-4">Cargando horarios...</p>
              ) : slots.length === 0 && courtId && bookingDate ? (
                <p className="text-sm text-amber-600 py-4">Sin horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setStartTime(s.start)}
                      className={`inline-flex items-center gap-2 rounded-lg border py-2.5 px-3 text-sm font-medium transition-colors ${
                        startTime === s.start
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Estado de la Reserva */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado de la Reserva
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 pl-3 pr-8"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* $ Información de Precios */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign className="h-4 w-4 text-gray-500" />
                Información de Precios
              </div>
              <div className="text-sm text-gray-600">
                Tarifa:{' '}
                <span className="font-medium text-gray-900">
                  {isNightTime ? 'Nocturna' : 'Diurna'}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  ({isNightTime ? '18:00 - 09:59' : '10:00 - 17:59'})
                </span>
              </div>
              <div className="text-sm pt-1">
                Precio por hora:{' '}
                <span className="font-semibold text-green-600">
                  ${pricePerHour.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Notas (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-gray-900 py-2.5 px-3"
                placeholder="Información adicional sobre la reserva..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : isEditing ? 'Actualizar Reserva' : 'Crear Reserva'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
