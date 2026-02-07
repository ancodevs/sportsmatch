'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SettingsFormProps {
  user: any;
  adminData: any;
}

export default function SettingsForm({ user, adminData }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      business_name: formData.get('business_name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
    };

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('admin_users')
        .update(data)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Configuración actualizada correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          type="email"
          id="email"
          value={user.email}
          disabled
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm px-3 py-2 border"
        />
        <p className="mt-1 text-xs text-gray-500">
          El correo electrónico no se puede cambiar
        </p>
      </div>

      <div>
        <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
          Nombre del negocio
        </label>
        <input
          type="text"
          name="business_name"
          id="business_name"
          defaultValue={adminData?.business_name || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
          placeholder="Ej: Complejo Deportivo Los Andes"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Teléfono de contacto
        </label>
        <input
          type="tel"
          name="phone"
          id="phone"
          defaultValue={adminData?.phone || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
          placeholder="+56 9 1234 5678"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Dirección del complejo deportivo
        </label>
        <input
          type="text"
          name="address"
          id="address"
          defaultValue={adminData?.address || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
          placeholder="Av. Libertador 123, Santiago"
        />
        <p className="mt-1 text-xs text-gray-500">
          Todas tus canchas estarán ubicadas en esta dirección
        </p>
      </div>

      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ubicación Asignada</h3>
        <p className="text-sm text-gray-600 mb-4">
          Solo puedes crear canchas en la ciudad que se te ha asignado. Para cambiar tu ubicación, contacta al administrador del sistema.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm px-3 py-2 border text-gray-600">
              {adminData?.cities?.regions?.countries?.name || 'No asignado'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Región
            </label>
            <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm px-3 py-2 border text-gray-600">
              {adminData?.cities?.regions?.name || 'No asignado'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm px-3 py-2 border text-gray-600">
              {adminData?.cities?.name || 'No asignado'}
            </div>
          </div>
        </div>

        {!adminData?.city_id && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ No tienes una ciudad asignada. No podrás crear canchas hasta que se te asigne una ubicación. Contacta al administrador del sistema.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
