'use client';

import { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface BookingsTableProps {
  bookings: any[];
}

export default function BookingsTable({ bookings }: BookingsTableProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success(
        newStatus === 'confirmed'
          ? 'Reserva confirmada'
          : newStatus === 'cancelled'
          ? 'Reserva cancelada'
          : 'Estado actualizado'
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Completada',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (bookings.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          No hay reservas
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Las reservas aparecerán aquí cuando los jugadores las realicen
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cancha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jugador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha y Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.courts?.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3" />
                    {booking.profiles?.email}
                  </div>
                  {booking.profiles?.telefono && (
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3" />
                      {booking.profiles.telefono}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {new Date(booking.booking_date).toLocaleDateString('es-CL')}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {booking.start_time} - {booking.end_time}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    ${booking.total_price.toLocaleString('es-CL')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.payment_status === 'paid' ? 'Pagado' : 'Pendiente pago'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(booking.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        disabled={updatingId === booking.id}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        title="Confirmar"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        disabled={updatingId === booking.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Cancelar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {booking.status !== 'pending' && (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
