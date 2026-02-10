'use client';

import Link from 'next/link';
import { MapPin, DollarSign, Users, Edit, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { getSportName } from '@/lib/court-utils';

interface CourtCardProps {
  court: any;
  adminData?: any;
}

export default function CourtCard({ court, adminData }: CourtCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta cancha?')) return;

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('courts')
        .delete()
        .eq('id', court.id);

      if (error) throw error;

      toast.success('Cancha eliminada correctamente');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la cancha');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {court.name}
            </h3>
            {court.sport_type && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {getSportName(court.sport_type)}
                </span>
              </div>
            )}
            {adminData && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">
                  {adminData.address || `${adminData.cities?.name}, ${adminData.cities?.regions?.name}`}
                </span>
              </div>
            )}
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              court.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {court.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>

        {court.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {court.description}
          </p>
        )}

        <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>
                <span className="font-medium">Diurno:</span> ${(court.day_price || 0).toLocaleString('es-CL')}/h
              </span>
            </div>
            {court.capacity && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {court.capacity} personas
              </div>
            )}
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>
              <span className="font-medium">Nocturno:</span> ${(court.night_price || 0).toLocaleString('es-CL')}/h
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/courts/${court.id}/edit`}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
