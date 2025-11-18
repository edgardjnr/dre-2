import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type PeriodType = 'current-month' | 'last-30-days' | 'last-3-months' | 'last-6-months' | 'custom';

export interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (startDate: string, endDate: string) => void;
}

const periodOptions = [
  { value: 'current-month' as PeriodType, label: 'Mês Atual' },
  { value: 'last-30-days' as PeriodType, label: 'Últimos 30 Dias' },
  { value: 'last-3-months' as PeriodType, label: 'Últimos 3 Meses' },
  { value: 'last-6-months' as PeriodType, label: 'Últimos 6 Meses' },
  { value: 'custom' as PeriodType, label: 'Período Personalizado' },
];

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  selectedPeriod,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = periodOptions.find(option => option.value === selectedPeriod);

  const handlePeriodSelect = (period: PeriodType) => {
    onPeriodChange(period);
    setIsOpen(false);
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    if (onCustomDateChange) {
      if (field === 'start') {
        onCustomDateChange(value, customEndDate || '');
      } else {
        onCustomDateChange(customStartDate || '', value);
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-2">
        {/* Dropdown do período */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{selectedOption?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodSelect(option.value)}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                    selectedPeriod === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campos de data personalizada */}
        {selectedPeriod === 'custom' && (
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={customStartDate || ''}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={customEndDate || ''}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlay para fechar o dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PeriodFilter;