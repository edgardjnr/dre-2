import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { ContaPagarStatus } from '../../../types';
import { format } from 'date-fns';
import { applyDateMask, isValidDate, convertToISODate, convertFromISODate } from '../../../utils/dateUtils';
import { DatePicker } from '../../ui/DatePicker';

// Função para garantir que a data seja salva sem conversão de timezone
const formatDateForDatabase = (dateString: string): string => {
  if (!dateString) return dateString;
  
  // Se a data já está no formato correto (YYYY-MM-DD), retorna como está
  // Isso evita conversões de timezone desnecessárias
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(dateString)) {
    return dateString;
  }
  
  // Se por algum motivo a data não está no formato esperado, 
  // cria uma nova data e formata corretamente
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

interface EditContaFormProps {
  currentStatus: ContaPagarStatus;
  currentDataVencimento: string;
  newStatus: ContaPagarStatus;
  newDataPagamento?: string;
  loading: boolean;
  onStatusChange: (status: ContaPagarStatus) => void;
  onDataPagamentoChange?: (data: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const formatCurrency = (value: string) => {
  // Remove tudo que não é dígito
  const numericValue = value.replace(/\D/g, '');
  
  // Converte para número e divide por 100 para ter centavos
  const numberValue = parseInt(numericValue) / 100;
  
  // Formata como moeda brasileira
  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const parseCurrencyToNumber = (value: string): number => {
  // Remove símbolos de moeda e espaços, substitui vírgula por ponto
  const numericString = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  return parseFloat(numericString) || 0;
};

export function EditContaForm({
  currentStatus,
  currentDataVencimento,
  newStatus,
  newDataPagamento = '',
  loading,
  onStatusChange,
  onDataPagamentoChange,
  onSave,
  onCancel
}: EditContaFormProps) {
  // Estado para data formatada dd/mm/yyyy (pagamento)
  const [dataPagamentoFormatada, setDataPagamentoFormatada] = useState<string>('');
  
  // Inicializar a data de pagamento formatada quando prop mudar
  useEffect(() => {
    if (newDataPagamento) {
      setDataPagamentoFormatada(convertFromISODate(newDataPagamento));
    } else {
      setDataPagamentoFormatada('');
    }
  }, [newDataPagamento]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'paga': return 'Paga';
      case 'vencida': return 'Vencida';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  // Determinar se a conta está vencida pela data de vencimento, independente do status salvo
  const isOverdue = (() => {
    if (!currentDataVencimento) return false;
    try {
      const due = new Date(`${currentDataVencimento}T00:00:00`);
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return due < todayDate && currentStatus !== 'paga' && currentStatus !== 'cancelada';
    } catch {
      return false;
    }
  })();
  
  // Exibir Data de Pagamento quando:
  // - usuário seleciona Paga
  // - status atual é Vencida
  // - status atual é Pendente E vencida pela data
  const showPagamentoField = newStatus === 'paga' || currentStatus === 'vencida' || (currentStatus === 'pendente' && isOverdue);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Editar Informações da Conta</h3>
        
        {/* Grid responsivo para os campos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Status */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => onStatusChange(e.target.value as ContaPagarStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Data de Pagamento - aparece somente quando status = paga */}
        {showPagamentoField && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2 md:col-span-1">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 mr-2" />
                Data de Pagamento *
              </label>
              <DatePicker
                value={dataPagamentoFormatada}
                onChange={(value) => {
                  setDataPagamentoFormatada(value);
                }}
                onISOChange={(isoValue) => {
                  onDataPagamentoChange && onDataPagamentoChange(isoValue);
                }}
                placeholder="dd/mm/yyyy"
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-1 sm:flex-none sm:min-w-[140px] px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-none sm:min-w-[100px] px-6 py-2.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
          >
            Cancelar
          </button>
        </div>

        {/* Aviso para status paga */}
        {newStatus === 'paga' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao marcar como paga, será gerado automaticamente um lançamento no DRE com o valor e data informados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { parseCurrencyToNumber, formatCurrency };
