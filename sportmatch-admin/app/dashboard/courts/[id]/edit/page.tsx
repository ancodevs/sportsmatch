import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import CourtForm from '@/components/CourtForm';

export default async function EditCourtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .eq('admin_id', user.id)
    .single();

  if (!court) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Cancha</h1>
        <p className="mt-1 text-sm text-gray-600">
          Actualiza la información de tu cancha deportiva
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <CourtForm adminData={adminData} court={court} />
      </div>
    </div>
  );
}
