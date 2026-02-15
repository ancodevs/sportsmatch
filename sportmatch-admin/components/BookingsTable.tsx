'use client';

import { useState } from 'react';
import { Calendar, Clock, Phone, Mail, Check, X, Pencil, Trash2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateBookingStatus, deleteBooking } from '@/lib/bookingUtils';
import BookingDetailsModal from './BookingDetailsModal';

interface BookingsTableProps {
  bookings: any[];
  onEdit: (booking: any) => void;
}

export default function BookingsTable({ bookings, onEdit }: BookingsTableProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingBooking, setViewingBooking] = useState<any | null>(null);

  const filteredBookings =
    filterStatus === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filterStatus);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const { error } = await updateBookingStatus(bookingId, newStatus as any);
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

  const handleDelete = async (booking: any) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;

    setUpdatingId(booking.id);
    try {
      const { error } = await deleteBooking(booking.id);
      if (error) throw error;

      toast.success('Reserva eliminada');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };

    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Completada',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] ?? 'bg-gray-100 text-gray-800'
        }`}
      >
        {labels[status] ?? status}
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
          Crea una nueva reserva o espera a que los jugadores reserven
        </p>
      </div>
    );
  }

  return (
    <>
      <BookingDetailsModal
        booking={viewingBooking}
        isOpen={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
      />
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendiente' },
          { value: 'confirmed', label: 'Confirmada' },
          { value: 'cancelled', label: 'Cancelada' },
          { value: 'completed', label: 'Completada' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterStatus === value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
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
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.courts?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Mostrar datos del cliente según el tipo de reserva */}
                    {booking.booking_type === 'manual' ? (
                      // Reserva manual: mostrar customer_*
                      <>
                        <div className="text-sm text-gray-900">
                          {booking.customer_first_name} {booking.customer_last_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                            Cliente externo
                          </span>
                        </div>
                        {booking.customer_phone && (
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3" />
                            {booking.customer_phone}
                          </div>
                        )}
                      </>
                    ) : (
                      // Reserva desde app: mostrar profiles
                      <>
                        <div className="text-sm text-gray-900">
                          {booking.profiles?.first_name} {booking.profiles?.last_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                            Cliente Futmatch
                          </span>
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
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(booking.booking_date).toLocaleDateString('es-CL')}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {String(booking.start_time).substring(0, 5)} -{' '}
                      {String(booking.end_time).substring(0, 5)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${Number(booking.total_price).toLocaleString('es-CL')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.payment_status === 'paid' ? 'Pagado' : 'Pendiente pago'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingBooking(booking)}
                        disabled={updatingId === booking.id}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            disabled={updatingId === booking.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'cancelled')}
                            disabled={updatingId === booking.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => onEdit(booking)}
                          disabled={updatingId === booking.id}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(booking)}
                        disabled={updatingId === booking.id}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  );
}
