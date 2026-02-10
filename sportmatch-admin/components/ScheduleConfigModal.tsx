'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { createWeekSchedules } from '@/lib/scheduleUtils';
import { getShortDayName } from '@/lib/scheduleUtils';

interface ScheduleConfigModalProps {
  courtId: string;
  courtName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6]; // Domingo a Sábado

export default function ScheduleConfigModal({
  courtId,
  courtName,
  isOpen,
  onClose,
  onSaved,
}: ScheduleConfigModalProps) {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('22:00');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [blockedDays, setBlockedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setBlockedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createWeekSchedules(
        courtId,
        startTime,
        endTime,
        intervalMinutes,
        blockedDays
      );
      toast.success('Horarios configurados correctamente');
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al configurar horarios');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Configurar Horarios - {courtName}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horario de apertura/cierre
              </label>
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-gray-500">Apertura</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cierre</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración de cada slot (minutos)
              </label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días bloqueados (sin reservas)
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={blockedDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">{getShortDayName(day)}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Marca los días en que la cancha no estará disponible
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  'Guardando...'
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Aplicar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
