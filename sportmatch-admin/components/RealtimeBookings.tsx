'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RealtimeBookingsProps {
  userId: string;
  initialBookings: any[];
  children: React.ReactNode;
}

export default function RealtimeBookings({ userId, initialBookings, children }: RealtimeBookingsProps) {
  const router = useRouter();
  const [hasNewBooking, setHasNewBooking] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Suscribirse a cambios en la tabla bookings
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          console.log('Nueva reserva detectada:', payload);

          // Verificar que la reserva es de una cancha del admin
          const { data: court } = await supabase
            .from('courts')
            .select('admin_id, name')
            .eq('id', payload.new.court_id)
            .single();

          if (court && court.admin_id === userId) {
            // Mostrar notificación
            toast.success(`¡Nueva reserva en ${court.name}!`, {
              description: `${new Date(payload.new.booking_date).toLocaleDateString('es-CL')} a las ${payload.new.start_time}`,
              duration: 10000,
            });

            setHasNewBooking(true);

            // Actualizar la página para mostrar la nueva reserva
            router.refresh();

            // Opcional: reproducir sonido de notificación
            if (typeof window !== 'undefined') {
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {
                  // Si falla, no hacer nada
                });
              } catch (error) {
                // Ignorar errores de audio
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          console.log('Reserva actualizada:', payload);

          // Verificar que la reserva es de una cancha del admin
          const { data: court } = await supabase
            .from('courts')
            .select('admin_id')
            .eq('id', payload.new.court_id)
            .single();

          if (court && court.admin_id === userId) {
            // Actualizar la página
            router.refresh();
          }
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Conectado a notificaciones en tiempo real');
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return <>{children}</>;
}
