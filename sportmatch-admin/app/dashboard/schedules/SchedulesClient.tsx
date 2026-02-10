'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Settings } from 'lucide-react';
import { getSportLabel, getSurfaceName } from '@/lib/court-utils';
import { getCourtSchedules, formatScheduleDisplay, Schedule } from '@/lib/scheduleUtils';
import CourtScheduleCard from '@/components/CourtScheduleCard';
import ScheduleConfigModal from '@/components/ScheduleConfigModal';

interface Court {
  id: string;
  name: string;
  sport_type: string | null;
  surface_type: string | null;
  day_price: number;
  night_price: number;
}

interface SchedulesClientProps {
  courts: Court[];
}

export default function SchedulesClient({ courts }: SchedulesClientProps) {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(courts[0] ?? null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!selectedCourt) return;
    setLoading(true);
    try {
      const data = await getCourtSchedules(selectedCourt.id);
      setSchedules(data);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCourt?.id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const hasSchedules = schedules.length > 0;
  const subtitle = selectedCourt
    ? [getSportLabel(selectedCourt.sport_type), getSurfaceName(selectedCourt.surface_type)]
        .filter(Boolean)
        .join(' • ') || 'Sin especificar'
    : '';

  if (courts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Clock className="mx-auto h-16 w-16 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          No hay canchas disponibles
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Crea al menos una cancha para poder configurar horarios
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Seleccionar Cancha */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Seleccionar Cancha</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court) => (
            <CourtScheduleCard
              key={court.id}
              court={court}
              isSelected={selectedCourt?.id === court.id}
              onSelect={() => setSelectedCourt(court)}
              onConfigure={() => {
                setSelectedCourt(court);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      {/* Horarios de la cancha seleccionada */}
      {selectedCourt && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Horarios de {selectedCourt.name}
              </h3>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 shrink-0"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Horarios
            </button>
          </div>
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Horarios Configurados</h4>
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                Cargando horarios...
              </div>
            ) : hasSchedules ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <p className="font-medium text-gray-900">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][schedule.day_of_week]}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatScheduleDisplay(schedule)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Clock className="mx-auto h-16 w-16 text-gray-400" />
                <h4 className="mt-4 text-lg font-semibold text-gray-900">
                  No hay horarios configurados
                </h4>
                <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                  Configura los horarios de esta cancha para que los clientes puedan hacer reservas
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-6 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Horarios
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ScheduleConfigModal
        courtId={selectedCourt?.id ?? ''}
        courtName={selectedCourt?.name ?? ''}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchSchedules}
      />
    </>
  );
}
