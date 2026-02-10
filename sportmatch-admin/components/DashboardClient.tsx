'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardClientProps {
  children: React.ReactNode;
  user: any;
  adminData: any;
}

export default function DashboardClient({
  children,
  user,
  adminData,
}: DashboardClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay móvil cuando el menú está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          user={user}
          adminData={adminData}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
