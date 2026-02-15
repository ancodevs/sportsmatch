'use client';

import { X, Calendar, Clock, DollarSign, User, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface BookingDetailsModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  if (!isOpen || !booking) return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Completada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pago pendiente',
      paid: 'Pagado',
      refunded: 'Reembolsado',
    };
    return labels[status] || status;
  };

  const isManualBooking = booking.booking_type === 'manual';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl z-10">
            <div className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Detalles de la Reserva</h3>
                <p className="text-sm text-gray-500 mt-1">
                  ID: {booking.id.substring(0, 8)}...
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Estado de la Reserva */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Estado de la Reserva</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600 mb-2">Estado de Pago</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    booking.payment_status === 'paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Información del Cliente */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900">Información del Cliente</h4>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Nombre completo</p>
                    <p className="text-base font-semibold text-gray-900">
                      {isManualBooking 
                        ? `${booking.customer_first_name} ${booking.customer_last_name}`
                        : `${booking.profiles?.first_name} ${booking.profiles?.last_name}`
                      }
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isManualBooking 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isManualBooking ? 'Cliente externo' : 'Cliente Futmatch'}
                  </span>
                </div>

                {!isManualBooking && booking.profiles?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Correo electrónico</p>
                      <p className="text-base text-gray-900">{booking.profiles.email}</p>
                    </div>
                  </div>
                )}

                {((isManualBooking && booking.customer_phone) || (!isManualBooking && booking.profiles?.telefono)) && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Teléfono</p>
                      <p className="text-base text-gray-900">
                        {isManualBooking ? booking.customer_phone : booking.profiles.telefono}
                      </p>
                    </div>
                  </div>
                )}

                {isManualBooking && booking.customer_run && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">RUN</p>
                      <p className="text-base text-gray-900 font-mono">{booking.customer_run}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Información de la Cancha */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Información de la Cancha</h4>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Cancha</p>
                    <p className="text-lg font-bold text-gray-900">{booking.courts?.name}</p>
                    {booking.courts?.sport_type && (
                      <p className="text-sm text-gray-600 mt-1">
                        Deporte: <span className="font-medium">{booking.courts.sport_type}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fecha y Horario */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Fecha y Horario</h4>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fecha</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(booking.booking_date).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Horario</p>
                    <p className="text-base font-semibold text-gray-900">
                      {String(booking.start_time).substring(0, 5)} - {String(booking.end_time).substring(0, 5)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Precio */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 rounded-full p-2">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Number(booking.total_price).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Moneda</p>
                  <p className="text-sm font-semibold text-gray-700">{booking.currency || 'CLP'}</p>
                </div>
              </div>
            </div>

            {/* Notas */}
            {booking.notes && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-1">Notas adicionales</p>
                    <p className="text-sm text-amber-800">{booking.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fechas de creación y actualización */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <p className="font-medium">Creada el:</p>
                  <p className="mt-1">
                    {new Date(booking.created_at).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Última actualización:</p>
                  <p className="mt-1">
                    {new Date(booking.updated_at).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 rounded-b-xl px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
