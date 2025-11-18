import { useState, useMemo } from 'react';
import { PeriodType } from '../PeriodFilter';

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
}

export const usePeriodFilter = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('current-month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const periodRange = useMemo((): PeriodRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case 'current-month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: startOfMonth,
          endDate: endOfMonth,
        };
      }

      case 'last-30-days': {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29); // 30 dias incluindo hoje
        return {
          startDate,
          endDate: today,
        };
      }

      case 'last-3-months': {
        const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate,
          endDate,
        };
      }

      case 'last-6-months': {
        const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate,
          endDate,
        };
      }

      case 'custom': {
        const startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = customEndDate ? new Date(customEndDate) : today;
        return {
          startDate,
          endDate,
        };
      }

      default:
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: today,
        };
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  const previousPeriodRange = useMemo((): PeriodRange => {
    const { startDate, endDate } = periodRange;
    const periodDuration = endDate.getTime() - startDate.getTime();
    
    const prevEndDate = new Date(startDate.getTime() - 1); // Um dia antes do início do período atual
    const prevStartDate = new Date(prevEndDate.getTime() - periodDuration);

    return {
      startDate: prevStartDate,
      endDate: prevEndDate,
    };
  }, [periodRange]);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isDateInRange = (date: Date, range: PeriodRange): boolean => {
    const dateTime = date.getTime();
    const startTime = range.startDate.getTime();
    const endTime = range.endDate.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  const getPeriodLabel = (): string => {
    switch (selectedPeriod) {
      case 'current-month':
        return 'Mês Atual';
      case 'last-30-days':
        return 'Últimos 30 Dias';
      case 'last-3-months':
        return 'Últimos 3 Meses';
      case 'last-6-months':
        return 'Últimos 6 Meses';
      case 'custom':
        return `${formatDateForAPI(periodRange.startDate)} a ${formatDateForAPI(periodRange.endDate)}`;
      default:
        return 'Período';
    }
  };

  return {
    selectedPeriod,
    customStartDate,
    customEndDate,
    periodRange,
    previousPeriodRange,
    handlePeriodChange,
    handleCustomDateChange,
    formatDateForAPI,
    isDateInRange,
    getPeriodLabel,
  };
};

export default usePeriodFilter;