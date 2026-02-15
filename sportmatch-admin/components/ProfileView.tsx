'use client';

import { Building2, Mail, Phone, MapPin, Globe, Tag } from 'lucide-react';

interface ProfileViewProps {
  adminData: any;
  userEmail: string;
  onEdit: () => void;
}

export default function ProfileView({ adminData, userEmail, onEdit }: ProfileViewProps) {
  const sports = adminData?.sports_offered || ['Fútbol', 'Fútbol 7'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil del Recinto</h1>
          <p className="text-sm text-gray-600 mt-1">Información de tu recinto deportivo</p>
        </div>
        
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Building2 className="w-4 h-4" />
          Editar Perfil
        </button>
      </div>

      {/* Banner del Recinto */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg overflow-hidden">
        <div className="p-8 flex items-center gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md">
              {adminData?.logo_url ? (
                <img
                  src={adminData.logo_url}
                  alt="Logo"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Building2 className="w-12 h-12 text-green-600" />
              )}
            </div>
          </div>

          {/* Nombre y Ubicación */}
          <div className="flex-1 text-white">
            <h2 className="text-3xl font-bold">
              {adminData?.business_name || 'CANCHAS DEL OLLO'}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-green-100">
              <MapPin className="w-4 h-4" />
              <span className="text-base">
                {adminData?.cities?.name || 'Rancagua'},{' '}
                {adminData?.cities?.regions?.name || "Libertador General Bernardo O'Higgins"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información de Contacto */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">Correo electrónico</span>
                </div>
                <p className="text-base font-medium text-gray-900 ml-6">
                  {userEmail || 'test@gmail.com'}
                </p>
              </div>

              {/* Teléfono */}
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Teléfono</span>
                </div>
                <p className="text-base font-medium text-gray-900 ml-6">
                  {adminData?.phone || '935229947'}
                </p>
              </div>

              {/* Dirección */}
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Dirección</span>
                </div>
                <p className="text-base font-medium text-gray-900 ml-6">
                  {adminData?.address || 'av alameda 3045'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deportes Disponibles */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Tag className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Deportes Disponibles</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {sports.map((sport: string, index: number) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                >
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación Completa */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-blue-900 mb-2">Ubicación</h3>
            <p className="text-blue-800">
              {adminData?.cities?.name || 'Rancagua'},{' '}
              {adminData?.cities?.regions?.name || "Libertador General Bernardo O'Higgins"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
