import { createClient } from '@/lib/supabase/server';
import { Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import CourtCard from '@/components/CourtCard';

export default async function CourtsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Obtener ubicación del administrador para mostrar en las canchas
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('address, cities(name, regions(name, countries(name)))')
    .eq('user_id', user.id)
    .single();

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Canchas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona tus canchas deportivas
          </p>
        </div>
        <Link
          href="/dashboard/courts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Cancha
        </Link>
      </div>

      {courts && courts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} adminData={adminData} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No hay canchas registradas
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza agregando tu primera cancha deportiva
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/courts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Cancha
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
