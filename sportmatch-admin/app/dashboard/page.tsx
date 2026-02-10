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

  const formatTime = (t: string) => String(t).substring(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Resumen de tu gestión de canchas deportivas
        </p>
      </div>

      {/* Stats Grid - responsive y legible */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white overflow-hidden rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98]"
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`flex-shrink-0 ${stat.color} rounded-lg p-2.5 sm:p-3`}>
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-0.5">
                    {stat.value}
                  </dd>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Reservas Recientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Reservas Recientes</h2>
        </div>
        <div className="p-4 sm:p-6">
          {bookings && bookings.length > 0 ? (
            <ul className="space-y-3 sm:space-y-4">
              {bookings.slice(0, 5).map((booking: any) => (
                <li
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {booking.courts?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.booking_date).toLocaleDateString('es-CL')} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-center px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-8 text-sm">
              No hay reservas aún
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
