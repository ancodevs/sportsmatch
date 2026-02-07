import { createClient } from '@/lib/supabase/server';
import BookingsTable from '@/components/BookingsTable';
import RealtimeBookings from '@/components/RealtimeBookings';

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Obtener reservas del administrador
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      courts!inner(id, name, admin_id),
      profiles(first_name, last_name, email, telefono)
    `)
    .eq('courts.admin_id', user.id)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona las reservas de tus canchas
        </p>
      </div>

      <RealtimeBookings userId={user.id} initialBookings={bookings || []}>
        <BookingsTable bookings={bookings || []} />
      </RealtimeBookings>
    </div>
  );
}
