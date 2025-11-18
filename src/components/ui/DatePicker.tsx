import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { applyDateMask, isValidDate, convertToISODate, convertFromISODate } from '../../utils/dateUtils';

interface DatePickerProps {
  value: string; // Valor no formato dd/mm/yyyy
  onChange: (value: string) => void; // Callback com valor dd/mm/yyyy
  onISOChange?: (isoValue: string) => void; // Callback com valor yyyy-MM-dd
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function DatePicker({
  value,
  onChange,
  onISOChange,
  placeholder = "dd/mm/yyyy",
  className = "",
  disabled = false,
  error = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [inputValue, setInputValue] = useState(value);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar inputValue com value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fechar calendário ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Atualizar mês/ano quando uma data válida é inserida
  useEffect(() => {
    if (value && isValidDate(value)) {
      const [day, month, year] = value.split('/').map(Number);
      setCurrentMonth(month - 1);
      setCurrentYear(year);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyDateMask(e.target.value);
    setInputValue(maskedValue);
    onChange(maskedValue);

    // Se a data está completa e válida, atualiza o valor ISO
    if (maskedValue.length === 10 && isValidDate(maskedValue)) {
      const isoDate = convertToISODate(maskedValue);
      onISOChange?.(isoDate);
    } else if (maskedValue.length < 10) {
      onISOChange?.('');
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleCalendarIconClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      inputRef.current?.focus();
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear}`;
    setInputValue(selectedDate);
    onChange(selectedDate);
    
    if (isValidDate(selectedDate)) {
      const isoDate = convertToISODate(selectedDate);
      onISOChange?.(isoDate);
    }
    
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const today = new Date();
    const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    setInputValue(todayFormatted);
    onChange(todayFormatted);
    
    const isoDate = convertToISODate(todayFormatted);
    onISOChange?.(isoDate);
    
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Dias vazios do mês anterior
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${currentYear}`;
      const isSelected = inputValue === dateStr && isValidDate(inputValue);
      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`w-8 h-8 text-sm rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            isSelected
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : isToday
              ? 'bg-blue-100 text-blue-600 font-semibold'
              : 'text-gray-700 hover:text-blue-600'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const isInputError = inputValue && inputValue.length === 10 && !isValidDate(inputValue);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:border-blue-500 transition-colors ${
            error || isInputError
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
        />
        <button
          type="button"
          onClick={handleCalendarIconClick}
          disabled={disabled}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <Calendar className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {isInputError && (
        <p className="text-red-500 text-xs mt-1">Data inválida</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
          {/* Header do calendário */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1900"
                max="2100"
              />
            </div>

            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendário */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {renderCalendar()}
          </div>

          {/* Botão Hoje */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}