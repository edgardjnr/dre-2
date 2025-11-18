// Utilitários para formatação e validação de datas

/**
 * Aplica máscara de data dd/mm/yyyy automaticamente
 * @param value - Valor do input
 * @returns Valor formatado com máscara
 */
export const applyDateMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara progressivamente
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};

/**
 * Valida se uma data no formato dd/mm/yyyy é válida
 * @param dateString - Data no formato dd/mm/yyyy
 * @returns true se a data é válida
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString || dateString.length !== 10) return false;
  
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Validações básicas
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Validação mais específica usando Date
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
};

/**
 * Converte data dd/mm/yyyy para yyyy-mm-dd (formato do banco)
 * @param dateString - Data no formato dd/mm/yyyy
 * @returns Data no formato yyyy-mm-dd ou string vazia se inválida
 */
export const convertToISODate = (dateString: string): string => {
  if (!isValidDate(dateString)) return '';
  
  const [day, month, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Converte data yyyy-mm-dd para dd/mm/yyyy (formato de exibição)
 * @param isoDate - Data no formato yyyy-mm-dd
 * @returns Data no formato dd/mm/yyyy ou string vazia se inválida
 */
export const convertFromISODate = (isoDate: string): string => {
  if (!isoDate) return '';
  
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = isoDate.match(regex);
  
  if (!match) return '';
  
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

/**
 * Função para formatar data para o banco de dados sem problemas de timezone
 * Mantém compatibilidade com código existente
 */
export const formatDateForDatabase = (dateString: string): string => {
  if (!dateString) return '';
  
  // Se já está no formato ISO (YYYY-MM-DD), retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Se está no formato dd/mm/yyyy, converte para ISO
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return convertToISODate(dateString);
  }

  // Suporte a dd-mm-yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    return convertToISODate(dateString.replace(/-/g, '/'));
  }

  // Suporte a yyyy/mm/dd
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // Para outros formatos, tenta criar uma data e formatar
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  return date.toISOString().split('T')[0];
};