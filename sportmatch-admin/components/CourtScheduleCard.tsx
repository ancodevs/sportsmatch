'use client';

import { Settings } from 'lucide-react';
import { getSportLabel, getSurfaceName } from '@/lib/court-utils';

interface CourtScheduleCardProps {
  court: {
    id: string;
    name: string;
    sport_type: string | null;
    surface_type: string | null;
    day_price: number;
    night_price: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onConfigure: () => void;
}

export default function CourtScheduleCard({
  court,
  isSelected,
  onSelect,
  onConfigure,
}: CourtScheduleCardProps) {
  const sportLabel = getSportLabel(court.sport_type);
  const surfaceLabel = getSurfaceName(court.surface_type);
  const subtitle =
    sportLabel && surfaceLabel ? `${sportLabel} • ${surfaceLabel}` : sportLabel || surfaceLabel || 'Sin especificar';

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all
        ${isSelected ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'}
      `}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfigure();
        }}
        className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/80 text-gray-600 hover:text-green-600"
        title="Configurar horarios"
      >
        <Settings className="h-5 w-5" />
      </button>
      <h3 className="text-lg font-semibold text-gray-900 pr-10">{court.name}</h3>
      <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      <div className="text-sm font-medium text-green-700 mt-2">
        <span>Diurno: ${(court.day_price || 0).toLocaleString('es-CL')}/h</span>
        <span className="mx-2">•</span>
        <span>Nocturno: ${(court.night_price || 0).toLocaleString('es-CL')}/h</span>
      </div>
    </div>
  );
}
