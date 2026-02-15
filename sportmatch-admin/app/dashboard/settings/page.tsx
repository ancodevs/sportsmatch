import { createClient } from '@/lib/supabase/server';
import ProfileManager from '@/components/ProfileManager';

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
    .select('*, cities(id, name, region_id, regions(id, name, countries(name)))')
    .eq('user_id', user.id)
    .single();

  // Obtener todas las regiones y ciudades para el selector
  const { data: regions } = await supabase
    .from('regions')
    .select('id, name')
    .order('name');

  const { data: cities } = await supabase
    .from('cities')
    .select('id, name, region_id')
    .order('name');

  const showLocationError = params.error === 'no_location';

  return (
    <div className="space-y-6">
      {showLocationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-4xl mx-auto">
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
                Para poder crear canchas, necesitas tener una ciudad asignada. Por favor, configura tu ubicación en esta página.
              </p>
            </div>
          </div>
        </div>
      )}

      <ProfileManager
        adminData={adminData}
        userEmail={user.email || ''}
        userId={user.id}
        regions={regions || []}
        cities={cities || []}
      />
    </div>
  );
}
