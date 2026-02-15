'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import ImageUpload from './ImageUpload';
import { Building2, MapPin, Mail, Phone, Tag, X } from 'lucide-react';

interface ProfileEditFormProps {
  adminData: any;
  userEmail: string;
  userId: string;
  regions: any[];
  cities: any[];
  onCancel: () => void;
  onSaved: () => void;
}

const SPORTS_OPTIONS = [
  'Fútbol',
  'Fútbol 5',
  'Fútbol 7',
  'Padel',
  'Tenis',
  'Básquet',
  'Vóleibol',
  'Hockey',
  'Otros',
];

export default function ProfileEditForm({
  adminData,
  userEmail,
  userId,
  regions,
  cities,
  onCancel,
  onSaved,
}: ProfileEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [showCustomSportInput, setShowCustomSportInput] = useState(false);
  const [customSportInput, setCustomSportInput] = useState('');
  
  const [formData, setFormData] = useState({
    business_name: adminData?.business_name || '',
    contact_email: userEmail || '',
    address: adminData?.address || '',
    region_id: adminData?.region_id || null,
    city_id: adminData?.city_id || null,
    phone: adminData?.phone || '',
    sports_offered: (adminData?.sports_offered || []) as string[],
    logo_url: adminData?.logo_url || null,
  });

  // Filtrar ciudades según región seleccionada
  const filteredCities = useMemo(() => {
    if (!formData.region_id) return [];
    return cities.filter(c => c.region_id === formData.region_id);
  }, [formData.region_id, cities]);

  // Si cambia la región, resetear ciudad
  useEffect(() => {
    if (formData.region_id && !filteredCities.find(c => c.id === formData.city_id)) {
      setFormData(prev => ({ ...prev, city_id: null }));
    }
  }, [formData.region_id, filteredCities, formData.city_id]);

  const handleSportsToggle = (sport: string) => {
    if (sport === 'Otros') {
      setShowCustomSportInput(!showCustomSportInput);
      return;
    }

    setFormData(prev => ({
      ...prev,
      sports_offered: prev.sports_offered.includes(sport)
        ? prev.sports_offered.filter(s => s !== sport)
        : [...prev.sports_offered, sport],
    }));
  };

  const handleAddCustomSport = () => {
    const trimmed = customSportInput.trim();
    if (trimmed && !formData.sports_offered.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        sports_offered: [...prev.sports_offered, trimmed],
      }));
      setCustomSportInput('');
      setShowCustomSportInput(false);
    }
  };

  const handleRemoveSport = (sport: string) => {
    // Solo permitir eliminar deportes personalizados (no predefinidos)
    if (!SPORTS_OPTIONS.includes(sport)) {
      setFormData(prev => ({
        ...prev,
        sports_offered: prev.sports_offered.filter(s => s !== sport),
      }));
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  const handleImageRemoved = () => {
    setFormData(prev => ({ ...prev, logo_url: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.business_name.trim()) {
      alert('El nombre del recinto es obligatorio');
      return;
    }
    if (!formData.contact_email.trim()) {
      alert('El correo de contacto es obligatorio');
      return;
    }
    if (!formData.address.trim()) {
      alert('La dirección es obligatoria');
      return;
    }
    if (!formData.region_id) {
      alert('Debes seleccionar una región');
      return;
    }
    if (!formData.city_id) {
      alert('Debes seleccionar una ciudad');
      return;
    }
    if (formData.sports_offered.length === 0) {
      alert('Debes seleccionar al menos un deporte');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      
      const updateData = {
        business_name: formData.business_name,
        address: formData.address,
        phone: formData.phone,
        region_id: formData.region_id,
        city_id: formData.city_id,
        sports_offered: formData.sports_offered,
        logo_url: formData.logo_url,
      };

      const { error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      alert('Perfil actualizado correctamente');
      onSaved();
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      alert(error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Perfil del Recinto</h1>
          <p className="text-sm text-gray-600 mt-1">Administra la información de tu recinto deportivo</p>
        </div>
        
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Logo */}
        <ImageUpload
          currentImageUrl={formData.logo_url}
          userId={userId}
          onImageUploaded={handleImageUploaded}
          onImageRemoved={handleImageRemoved}
        />

        {/* Nombre del Recinto */}
        <div>
          <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Nombre del Recinto *
            </div>
          </label>
          <input
            type="text"
            id="business_name"
            value={formData.business_name}
            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ej: CANCHAS DEL OLLO"
            required
          />
        </div>

        {/* Correo de Contacto */}
        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Correo de Contacto *
            </div>
          </label>
          <input
            type="email"
            id="contact_email"
            value={formData.contact_email}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            El correo electrónico no se puede cambiar
          </p>
        </div>

        {/* Dirección Completa */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dirección Completa *
            </div>
          </label>
          <input
            type="text"
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="av alameda 3045"
            required
          />
        </div>

        {/* Región y Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="region_id" className="block text-sm font-medium text-gray-700 mb-1">
              Región *
            </label>
            <select
              id="region_id"
              value={formData.region_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, region_id: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
              required
            >
              <option value="">Selecciona región</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city_id" className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad *
            </label>
            <select
              id="city_id"
              value={formData.city_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
              required
              disabled={!formData.region_id}
            >
              <option value="">Selecciona ciudad</option>
              {filteredCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teléfono de Contacto */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono de Contacto
            </div>
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="935229947"
          />
        </div>

        {/* Deportes que se Practican */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Deportes que se Practican *
            </div>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SPORTS_OPTIONS.map((sport) => {
              const isSelected = formData.sports_offered.includes(sport);
              const isOthers = sport === 'Otros';

              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => handleSportsToggle(sport)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                  }`}
                >
                  {sport}
                </button>
              );
            })}
          </div>

          {/* Input para deporte personalizado */}
          {showCustomSportInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customSportInput}
                onChange={(e) => setCustomSportInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSport())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nombre del deporte personalizado"
              />
              <button
                type="button"
                onClick={handleAddCustomSport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Agregar
              </button>
            </div>
          )}

          {/* Deportes seleccionados */}
          {formData.sports_offered.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Deportes seleccionados:</p>
              <div className="flex flex-wrap gap-2">
                {formData.sports_offered.map((sport) => {
                  const isCustom = !SPORTS_OPTIONS.includes(sport);
                  
                  return (
                    <span
                      key={sport}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {sport}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSport(sport)}
                          className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón Guardar */}
        <div className="pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            <Building2 className="w-5 h-5" />
            {loading ? 'Guardando cambios...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
