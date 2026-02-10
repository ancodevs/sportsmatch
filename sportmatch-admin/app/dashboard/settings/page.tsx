import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/SettingsForm';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  if (!user) return null;

  const { data: adminData } = await supabase
    .from('admin_users')
    .select('*, cities(name, regions(name, countries(name)))')
    .eq('user_id', user.id)
    .single();

  const showLocationError = params.error === 'no_location';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona tu información de administrador
        </p>
      </div>

      {showLocationError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                No puedes crear canchas sin una ubicación asignada
              </h3>
              <p className="mt-2 text-sm text-red-700">
                Para poder crear canchas, necesitas tener una ciudad asignada. Por favor, contacta al administrador del sistema para que te asigne una ubicación.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6">
        <SettingsForm user={user} adminData={adminData} />
      </div>
    </div>
  );
}
