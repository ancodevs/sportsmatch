'use client';

import { useMemo } from 'react';

interface Court {
  id: string;
  name: string;
  sport_type: string | null;
  is_active: boolean;
}

interface Booking {
  id: string;
  court_id: string;
  player_id?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  courts?: Court;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export function useBookingAnalytics(bookings: Booking[], courts: Court[], dateRange: DateRange) {
  
  // Filtrar reservas por rango de fechas
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const bookingDate = new Date(b.booking_date);
      return bookingDate >= dateRange.start && bookingDate <= dateRange.end;
    });
  }, [bookings, dateRange]);

  // Reservas confirmadas
  const confirmedBookings = useMemo(() => {
    return filteredBookings.filter(b => b.status === 'confirmed');
  }, [filteredBookings]);

  // Reservas canceladas
  const cancelledBookings = useMemo(() => {
    return filteredBookings.filter(b => b.status === 'cancelled');
  }, [filteredBookings]);

  // Calcular ingresos totales
  const totalRevenue = useMemo(() => {
    return confirmedBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  }, [confirmedBookings]);

  // Calcular ingreso promedio
  const averageRevenue = useMemo(() => {
    if (confirmedBookings.length === 0) return 0;
    return totalRevenue / confirmedBookings.length;
  }, [totalRevenue, confirmedBookings]);

  // Calcular tasa de cancelación
  const cancellationRate = useMemo(() => {
    if (filteredBookings.length === 0) return 0;
    return (cancelledBookings.length / filteredBookings.length) * 100;
  }, [cancelledBookings, filteredBookings]);

  // Calcular tasa de ocupación
  const occupancyRate = useMemo(() => {
    const activeCourts = courts.filter(c => c.is_active).length;
    if (activeCourts === 0) return 0;

    const daysInPeriod = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hoursPerDay = 14; // Asumiendo 14 horas disponibles por día
    const totalAvailableSlots = activeCourts * hoursPerDay * daysInPeriod;

    if (totalAvailableSlots === 0) return 0;
    return (confirmedBookings.length / totalAvailableSlots) * 100;
  }, [courts, confirmedBookings, dateRange]);

  // Hora más popular
  const mostPopularHour = useMemo(() => {
    if (confirmedBookings.length === 0) return 'N/A';
    
    const hourCounts: Record<string, number> = {};
    confirmedBookings.forEach(b => {
      const hour = b.start_time.substring(0, 5);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const maxHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > max.count ? { hour, count } : max,
      { hour: '', count: 0 }
    );

    return maxHour.hour || 'N/A';
  }, [confirmedBookings]);

  // Día más popular
  const mostPopularDay = useMemo(() => {
    if (confirmedBookings.length === 0) return 'N/A';
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayCounts: Record<number, number> = {};
    
    confirmedBookings.forEach(b => {
      const day = new Date(b.booking_date).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const maxDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
      count > max.count ? { day: Number(day), count } : max,
      { day: 0, count: 0 }
    );

    return dayNames[maxDay.day];
  }, [confirmedBookings]);

  // Deporte más jugado
  const mostPlayedSport = useMemo(() => {
    if (confirmedBookings.length === 0) return 'N/A';
    
    const sportCounts: Record<string, number> = {};
    confirmedBookings.forEach(b => {
      const sport = b.courts?.sport_type || 'Sin definir';
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });

    const maxSport = Object.entries(sportCounts).reduce((max, [sport, count]) => 
      count > max.count ? { sport, count } : max,
      { sport: 'N/A', count: 0 }
    );

    return maxSport.sport;
  }, [confirmedBookings]);

  // Cancha más rentable
  const mostProfitableCourt = useMemo(() => {
    if (confirmedBookings.length === 0) return { name: 'N/A', revenue: 0 };
    
    const courtRevenues: Record<string, { name: string; revenue: number }> = {};
    
    confirmedBookings.forEach(b => {
      const courtId = b.court_id;
      const courtName = b.courts?.name || 'Sin nombre';
      
      if (!courtRevenues[courtId]) {
        courtRevenues[courtId] = { name: courtName, revenue: 0 };
      }
      courtRevenues[courtId].revenue += Number(b.total_price) || 0;
    });

    const maxCourt = Object.values(courtRevenues).reduce((max, court) => 
      court.revenue > max.revenue ? court : max,
      { name: 'N/A', revenue: 0 }
    );

    return maxCourt;
  }, [confirmedBookings]);

  // Clientes recurrentes (usando player_id)
  const recurringCustomersCount = useMemo(() => {
    const playerCounts: Record<string, number> = {};
    
    confirmedBookings.forEach(b => {
      if (b.player_id) {
        playerCounts[b.player_id] = (playerCounts[b.player_id] || 0) + 1;
      }
    });

    return Object.values(playerCounts).filter(count => count >= 2).length;
  }, [confirmedBookings]);

  // Reservas por día de la semana
  const bookingsByDayOfWeek = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const counts = new Array(7).fill(0);
    
    confirmedBookings.forEach(b => {
      const day = new Date(b.booking_date).getDay();
      counts[day]++;
    });

    return dayNames.map((name, index) => ({
      day: name,
      count: counts[index]
    }));
  }, [confirmedBookings]);

  // Reservas por horario (agrupadas por hora)
  const bookingsByHour = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    
    confirmedBookings.forEach(b => {
      const hour = b.start_time.substring(0, 2);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        count
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [confirmedBookings]);

  // Proyección próximo mes (simple: promedio últimos meses)
  const nextMonthProjection = useMemo(() => {
    if (confirmedBookings.length === 0) return 0;
    
    const daysInPeriod = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyAverage = totalRevenue / Math.max(daysInPeriod, 1);
    const daysNextMonth = 30;
    
    return dailyAverage * daysNextMonth;
  }, [totalRevenue, dateRange, confirmedBookings]);

  // Tendencia estacional (comparación con período anterior)
  const seasonalTrend = useMemo(() => {
    // Calcular período anterior del mismo tamaño
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodLength);
    const previousEnd = new Date(dateRange.start.getTime() - 1);

    const previousBookings = bookings.filter(b => {
      const bookingDate = new Date(b.booking_date);
      return bookingDate >= previousStart && bookingDate <= previousEnd && b.status === 'confirmed';
    });

    const previousRevenue = previousBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    
    if (previousRevenue === 0) {
      return { change: 0, trend: 'stable' as const };
    }

    const changePercent = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    
    return {
      change: changePercent,
      trend: changePercent > 5 ? 'up' as const : changePercent < -5 ? 'down' as const : 'stable' as const
    };
  }, [bookings, totalRevenue, dateRange]);

  return {
    // Métricas básicas
    totalRevenue,
    occupancyRate,
    averageRevenue,
    cancellationRate,
    mostPopularHour,
    mostPopularDay,
    mostPlayedSport,
    
    // Métricas avanzadas
    mostProfitableCourt,
    recurringCustomersCount,
    nextMonthProjection,
    seasonalTrend,
    
    // Datos para gráficos
    bookingsByDayOfWeek,
    bookingsByHour,
    
    // Contadores
    totalBookings: filteredBookings.length,
    confirmedCount: confirmedBookings.length,
    cancelledCount: cancelledBookings.length,
  };
}
