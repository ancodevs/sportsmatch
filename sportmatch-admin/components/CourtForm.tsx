'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sportOptions, surfaceOptions } from '@/lib/court-utils';

interface CourtFormProps {
  adminData: any;
  court?: any;
}

export default function CourtForm({ adminData, court }: CourtFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // La ubicación viene del administrador
  const cityId = adminData?.city_id;
  const cityName = adminData?.cities?.name;
  const regionName = adminData?.cities?.regions?.name;
  const countryName = adminData?.cities?.regions?.countries?.name;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      sport_type: formData.get('sport_type') as string,
      surface_type: formData.get('surface_type') as string,
      has_lighting: formData.get('has_lighting') === 'on',
      has_parking: formData.get('has_parking') === 'on',
      has_changing_rooms: formData.get('has_changing_rooms') === 'on',
      price_per_hour: Number(formData.get('price_per_hour')),
      currency: 'CLP',
      capacity: Number(formData.get('capacity')) || null,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No autenticado');

      if (court) {
        // Actualizar
        const { error } = await supabase
          .from('courts')
          .update(data)
          .eq('id', court.id);

        if (error) throw error;
        toast.success('Cancha actualizada correctamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('courts')
          .insert([{ ...data, admin_id: user.id }]);

        if (error) throw error;
        toast.success('Cancha creada correctamente');
      }

      router.push('/dashboard/courts');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la cancha');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre de la cancha *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            defaultValue={court?.name}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
            placeholder="Ej: Cancha Fútbol 7 - Central"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={court?.description}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
            placeholder="Describe tu cancha..."
          />
        </div>

        <div className="sm:col-span-2">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Ubicación de tus canchas
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="mb-1">Todas tus canchas están ubicadas en:</p>
                  <div className="font-semibold">
                    {adminData?.address || 'Sin dirección configurada'}
                  </div>
                  <div className="text-xs mt-1">
                    {cityName}, {regionName}, {countryName}
                  </div>
                  {!adminData?.address && (
                    <p className="mt-2 text-yellow-700 text-xs">
                      ⚠️ Configura la dirección de tu complejo en <a href="/dashboard/settings" className="underline font-medium">Configuración</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="sport_type" className="block text-sm font-medium text-gray-700">
            Tipo de deporte *
          </label>
          <select
            name="sport_type"
            id="sport_type"
            required
            defaultValue={court?.sport_type || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
          >
            <option value="">Selecciona un deporte</option>
            {sportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="surface_type" className="block text-sm font-medium text-gray-700">
            Tipo de superficie
          </label>
          <select
            name="surface_type"
            id="surface_type"
            defaultValue={court?.surface_type || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
          >
            <option value="">Selecciona tipo</option>
            {surfaceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="price_per_hour" className="block text-sm font-medium text-gray-700">
            Precio por hora (CLP) *
          </label>
          <input
            type="number"
            name="price_per_hour"
            id="price_per_hour"
            required
            min="0"
            defaultValue={court?.price_per_hour}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
            placeholder="25000"
          />
        </div>

        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
            Capacidad (jugadores)
          </label>
          <input
            type="number"
            name="capacity"
            id="capacity"
            min="0"
            defaultValue={court?.capacity}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
            placeholder="14"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="has_lighting"
                id="has_lighting"
                defaultChecked={court?.has_lighting}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="has_lighting" className="ml-2 block text-sm text-gray-700">
                Tiene iluminación
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="has_parking"
                id="has_parking"
                defaultChecked={court?.has_parking}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="has_parking" className="ml-2 block text-sm text-gray-700">
                Tiene estacionamiento
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="has_changing_rooms"
                id="has_changing_rooms"
                defaultChecked={court?.has_changing_rooms}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="has_changing_rooms" className="ml-2 block text-sm text-gray-700">
                Tiene camarines
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                defaultChecked={court?.is_active !== false}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Cancha activa (visible para reservas)
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : court ? 'Actualizar' : 'Crear Cancha'}
        </button>
      </div>
    </form>
  );
}
