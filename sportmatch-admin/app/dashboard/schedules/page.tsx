import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Clock, Info } from 'lucide-react';
import SchedulesClient from './SchedulesClient';

export default async function SchedulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, sport_type, surface_type, day_price, night_price')
    .eq('admin_id', user.id)
    .eq('is_active', true)
    .order('name');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Horarios</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configura horarios y disponibilidad
        </p>
      </div>

      {/* Sección principal */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Gestión de Horarios
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configura los horarios de apertura y disponibilidad para cada cancha
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg shrink-0">
            <Info className="h-4 w-4" />
            <span>
              Los horarios determinan cuándo los clientes pueden hacer reservas
            </span>
          </div>
        </div>

        {/* Contenido cliente (selección de cancha + horarios) */}
        <SchedulesClient courts={courts ?? []} />
      </div>

      {/* Consejo */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-gray-900">Consejo</h3>
            <p className="text-sm text-gray-600 mt-1">
              Los clientes podrán hacer reservas solo en los horarios y días configurados.
              Asegúrate de que los horarios reflejen la disponibilidad real de tu centro deportivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
