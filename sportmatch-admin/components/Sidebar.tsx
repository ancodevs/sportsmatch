'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, CalendarClock, Clock, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Canchas', href: '/dashboard/courts', icon: Building2 },
  { name: 'Horarios', href: '/dashboard/schedules', icon: Clock },
  { name: 'Reservas', href: '/dashboard/bookings', icon: CalendarClock },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <div className="flex items-center justify-between flex-shrink-0 px-4 pt-5 pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          SportMatch
        </h1>
        {/* Botón cerrar solo en móvil */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-2 -mr-2 rounded-lg text-green-200 hover:text-white hover:bg-green-600 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="mt-6 flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-green-800/90 text-white shadow-sm'
                  : 'text-green-100 hover:bg-green-600/80 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'flex-shrink-0 h-5 w-5',
                  isActive ? 'text-white' : 'text-green-300 group-hover:text-white'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: sidebar fija */}
      <aside
        className={cn(
          'hidden md:flex md:flex-shrink-0 md:flex-col md:w-56 lg:w-64',
          'bg-green-700 border-r border-green-800/50'
        )}
      >
        <div className="flex flex-col flex-grow min-h-0">
          {navContent}
        </div>
      </aside>

      {/* Móvil: drawer que se desliza */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-72 max-w-[85vw]',
          'bg-green-700 border-r border-green-800/50 shadow-xl',
          'transform transition-transform duration-200 ease-out',
          'md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-modal="true"
        aria-label="Menú de navegación"
        role="dialog"
      >
        <div className="flex flex-col flex-grow min-h-0">
          {navContent}
        </div>
      </aside>
    </>
  );
}
