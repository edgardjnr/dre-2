import { useState, useEffect } from 'react';

/**
 * Hook para criar um valor com debounce
 * @param value O valor a ser observado
 * @param delay O tempo de espera em milissegundos
 * @returns O valor após o tempo de espera
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configurar o timer para atualizar o valor após o delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpar o timer se o valor mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}