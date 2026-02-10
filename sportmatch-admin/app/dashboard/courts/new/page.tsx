import { createClient } from '@/lib/supabase/server';
import CourtForm from '@/components/CourtForm';
import { redirect } from 'next/navigation';

export default async function NewCourtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Obtener la ubicación asignada del administrador
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('*, cities(id, name, region_id, regions(id, name, countries(name)))')
    .eq('user_id', user.id)
    .single();

  // Si no tiene ciudad asignada, redirigir a configuración
  if (!adminData?.city_id) {
    redirect('/dashboard/settings?error=no_location');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nueva Cancha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Completa la información de tu cancha deportiva
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <CourtForm adminData={adminData} />
      </div>
    </div>
  );
}
