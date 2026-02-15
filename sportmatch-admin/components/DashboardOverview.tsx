'use client';

import { useMemo, useState } from 'react';
import { useBookingAnalytics } from '@/hooks/useBookingAnalytics';
import ExportButtons from './ExportButtons';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  XCircle,
  Clock,
  Calendar,
  Trophy,
  Target,
  Users,
  Activity,
  Zap
} from 'lucide-react';

interface DashboardOverviewProps {
  bookings: any[];
  courts: any[];
}

type PeriodType = 'month' | 'quarter' | 'semester' | 'year' | 'lastYear' | 'last5Years';

const PERIOD_OPTIONS: {value: PeriodType; label: string}[] = [
  { value: 'month', label: 'Este Mes' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'semester', label: 'Este Semestre' },
  { value: 'year', label: 'Este Año' },
  { value: 'lastYear', label: 'Último Año' },
  { value: 'last5Years', label: 'Últimos 5 Años' },
];

function getDateRange(period: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;

  switch (period) {
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    case 'semester':
      const semesterStartMonth = now.getMonth() < 6 ? 0 : 6;
      start = new Date(now.getFullYear(), semesterStartMonth, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'lastYear':
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case 'last5Years':
      start = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function DashboardOverview({ bookings, courts }: DashboardOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  
  const dateRange = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);
  
  const analytics = useBookingAnalytics(bookings, courts, dateRange);

  // KPIs básicos para las tarjetas superiores
  const basicKPIs = [
    {
      name: 'Ingresos Este Mes',
      value: formatCurrency(analytics.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      name: 'Tasa de Ocupación',
      value: formatPercentage(analytics.occupancyRate),
      icon: BarChart3,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      name: 'Ingreso Promedio',
      value: formatCurrency(analytics.averageRevenue),
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      name: 'Tasa de Cancelación',
      value: formatPercentage(analytics.cancellationRate),
      icon: XCircle,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      name: 'Hora Más Popular',
      value: analytics.mostPopularHour,
      icon: Clock,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      name: 'Día Más Popular',
      value: analytics.mostPopularDay,
      icon: Calendar,
      color: 'bg-indigo-500',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      name: 'Deporte Más Jugado',
      value: analytics.mostPlayedSport,
      icon: Trophy,
      color: 'bg-yellow-500',
      bgLight: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
  ];

  // KPIs avanzados
  const advancedKPIs = [
    {
      name: 'Cancha Más Rentable',
      value: analytics.mostProfitableCourt.name,
      icon: Target,
      bgLight: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      name: 'Clientes Recurrentes',
      value: `${analytics.recurringCustomersCount} de ${analytics.confirmedCount || 0}`,
      percentage: analytics.confirmedCount > 0 
        ? formatPercentage((analytics.recurringCustomersCount / analytics.confirmedCount) * 100)
        : '0.0%',
      icon: Users,
      bgLight: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      name: 'Proyección Próximo Mes',
      value: formatCurrency(analytics.nextMonthProjection),
      change: analytics.seasonalTrend.change > 0 ? `+${formatPercentage(analytics.seasonalTrend.change)}` : formatPercentage(analytics.seasonalTrend.change),
      icon: Activity,
      bgLight: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      name: 'Tendencia Estacional',
      value: analytics.seasonalTrend.trend === 'up' ? 'Temporada alta' : analytics.seasonalTrend.trend === 'down' ? 'Temporada baja' : 'Estable',
      change: formatPercentage(Math.abs(analytics.seasonalTrend.change)),
      icon: Zap,
      bgLight: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
  ];

  // Preparar datos para exportación
  const exportData = useMemo(() => {
    const basicKPIsData = [
      { name: 'Ingresos Este Mes', value: formatCurrency(analytics.totalRevenue) },
      { name: 'Tasa de Ocupación', value: formatPercentage(analytics.occupancyRate) },
      { name: 'Ingreso Promedio', value: formatCurrency(analytics.averageRevenue) },
      { name: 'Tasa de Cancelación', value: formatPercentage(analytics.cancellationRate) },
      { name: 'Hora Más Popular', value: analytics.mostPopularHour },
      { name: 'Día Más Popular', value: analytics.mostPopularDay },
      { name: 'Deporte Más Jugado', value: analytics.mostPlayedSport },
    ];

    const advancedKPIsData = [
      {
        name: 'Cancha Más Rentable',
        value: analytics.mostProfitableCourt.name,
        percentage: formatCurrency(analytics.mostProfitableCourt.revenue),
      },
      {
        name: 'Clientes Recurrentes',
        value: `${analytics.recurringCustomersCount}`,
        percentage: analytics.confirmedCount > 0 
          ? formatPercentage((analytics.recurringCustomersCount / analytics.confirmedCount) * 100)
          : '0%',
      },
      {
        name: 'Proyección Próximo Mes',
        value: formatCurrency(analytics.nextMonthProjection),
        change: analytics.seasonalTrend.change > 0 
          ? `+${formatPercentage(analytics.seasonalTrend.change)}` 
          : formatPercentage(analytics.seasonalTrend.change),
      },
      {
        name: 'Tendencia Estacional',
        value: analytics.seasonalTrend.trend === 'up' ? 'Temporada alta' : analytics.seasonalTrend.trend === 'down' ? 'Temporada baja' : 'Estable',
        change: formatPercentage(Math.abs(analytics.seasonalTrend.change)),
      },
    ];

    return {
      periodLabel: PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label || 'Este Mes',
      dateRange,
      basicKPIs: basicKPIsData,
      advancedKPIs: advancedKPIsData,
      bookingsByDay: analytics.bookingsByDayOfWeek,
      bookingsByHour: analytics.bookingsByHour,
      totalRevenue: analytics.totalRevenue,
      confirmedCount: analytics.confirmedCount,
    };
  }, [analytics, selectedPeriod, dateRange]);

  return (
    <div className="space-y-6">
      {/* Header con selector de período y botones de exportación */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📊 Período de Análisis</h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona el período para analizar tus métricas
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === option.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botones de Exportación */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <ExportButtons {...exportData} />
        </div>
      </div>

      {/* Período actual y comparación */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Período actual:</p>
            <p className="text-lg font-bold text-gray-900">
              {dateRange.start.toLocaleDateString('es-CL')} - {dateRange.end.toLocaleDateString('es-CL')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Comparación vs período anterior:</p>
            <div className="flex items-center gap-2 justify-end">
              <span className={`text-lg font-bold ${
                analytics.seasonalTrend.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analytics.seasonalTrend.change >= 0 ? '↑' : '↓'} Ingresos: {formatPercentage(Math.abs(analytics.seasonalTrend.change))}
              </span>
              <span className={`text-lg font-bold ${
                analytics.seasonalTrend.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analytics.seasonalTrend.change >= 0 ? '↑' : '↓'} Reservas: {formatPercentage(Math.abs(analytics.seasonalTrend.change))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Básicos - Grid adaptativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {basicKPIs.map((kpi) => (
          <div
            key={kpi.name}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${kpi.color} rounded-lg p-2.5`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{kpi.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Análisis Avanzado */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Análisis Avanzado</h3>
        <p className="text-sm text-gray-600 mb-4">Métricas estratégicas para optimizar tu negocio</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {advancedKPIs.map((kpi) => (
            <div
              key={kpi.name}
              className={`${kpi.bgLight} rounded-xl p-5 border border-gray-100`}
            >
              <div className="flex items-center gap-3 mb-3">
                <kpi.icon className={`h-6 w-6 ${kpi.iconColor}`} />
                <h4 className="font-semibold text-gray-900 text-sm">{kpi.name}</h4>
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              {kpi.percentage && (
                <p className="text-sm text-gray-600 mt-1">{kpi.percentage}</p>
              )}
              {kpi.change && (
                <p className={`text-sm font-medium mt-1 ${
                  kpi.change.startsWith('+') ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {kpi.change}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas por Día de la Semana */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas por Día de la Semana</h3>
          <div className="space-y-3">
            {analytics.bookingsByDayOfWeek.map((item) => {
              const maxCount = Math.max(...analytics.bookingsByDayOfWeek.map(d => d.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              
              return (
                <div key={item.day}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.day}</span>
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reservas por Horario */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas por Horario</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {analytics.bookingsByHour.length > 0 ? (
              analytics.bookingsByHour.map((item) => {
                const maxCount = Math.max(...analytics.bookingsByHour.map(h => h.count));
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                  <div key={item.hour}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.hour}</span>
                      <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-8">No hay datos de horarios disponibles</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
