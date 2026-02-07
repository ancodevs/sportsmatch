'use client';

import { useState } from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HeaderProps {
  user: any;
  adminData: any;
}

export default function Header({ user, adminData }: HeaderProps) {
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

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Panel de Administración
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {adminData.business_name || user.email}
              </p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
              <User className="h-5 w-5" />
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Cerrar sesión"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
