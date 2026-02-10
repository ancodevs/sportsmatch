'use client';

import { useState } from 'react';
import { Bell, LogOut, User, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HeaderProps {
  user: any;
  adminData: any;
  onMenuClick?: () => void;
}

export default function Header({ user, adminData, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Sesión cerrada correctamente');
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error('Error al cerrar sesión');
      setLoading(false);
    }
  };

  const businessName = adminData?.business_name || user?.email || 'Administrador';

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger solo en móvil */}
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden flex-shrink-0 p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">
            Panel de Administración
          </h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
          <button
            type="button"
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-700 truncate max-w-[140px] lg:max-w-none">
                {businessName}
              </p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
