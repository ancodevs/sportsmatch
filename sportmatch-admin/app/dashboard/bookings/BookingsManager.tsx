'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import BookingsTable from '@/components/BookingsTable';
import BookingForm from '@/components/BookingForm';

interface BookingsManagerProps {
  bookings: any[];
  courts: { id: string; name: string; sport_type?: string | null; day_price?: number; night_price?: number }[];
}

export default function BookingsManager({ bookings, courts }: BookingsManagerProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  const handleEdit = (booking: any) => {
    setEditingBooking(booking);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingBooking(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingBooking(null);
  };

  return (
    <div className="space-y-6">
      {/* Resumen y botón Nueva Reserva */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Confirmadas</p>
            <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Canceladas</p>
            <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Completadas</p>
            <p className="text-2xl font-bold text-blue-700">{stats.completed}</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          disabled={courts.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Reserva
        </button>
      </div>

      {courts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Necesitas crear al menos una cancha para poder crear reservas.
        </div>
      )}

      <BookingsTable bookings={bookings} onEdit={handleEdit} />

      <BookingForm
        isOpen={formOpen}
        onClose={handleClose}
        onSaved={() => router.refresh()}
        courts={courts}
        editingBooking={editingBooking}
      />
    </div>
  );
}
