import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, CalendarClock, Building2, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Obtener estadísticas
  const { data: courts } = await supabase
    .from('courts')
    .select('*', { count: 'exact' })
    .eq('admin_id', user.id);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, courts!inner(*)', { count: 'exact' })
    .eq('courts.admin_id', user.id);

  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('*, courts!inner(*)', { count: 'exact' })
    .eq('courts.admin_id', user.id)
    .eq('booking_date', new Date().toISOString().split('T')[0]);

  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('*, courts!inner(*)', { count: 'exact' })
    .eq('courts.admin_id', user.id)
    .eq('status', 'pending');

  const stats = [
    {
      name: 'Total Canchas',
      value: courts?.length || 0,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/dashboard/courts',
    },
    {
      name: 'Reservas Hoy',
      value: todayBookings?.length || 0,
      icon: CalendarClock,
      color: 'bg-green-500',
      href: '/dashboard/bookings',
    },
    {
      name: 'Reservas Pendientes',
      value: pendingBookings?.length || 0,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      href: '/dashboard/bookings?status=pending',
    },
    {
      name: 'Total Reservas',
      value: bookings?.length || 0,
      icon: LayoutDashboard,
      color: 'bg-purple-500',
      href: '/dashboard/bookings',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Resumen de tu gestión de canchas deportivas
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reservas Recientes</h2>
        </div>
        <div className="p-6">
          {bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking: any) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.courts?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.booking_date).toLocaleDateString('es-CL')} • {booking.start_time} - {booking.end_time}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay reservas aún
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
