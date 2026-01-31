import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Edit3 } from 'lucide-react';
import { ContaPagarStatus } from '../../../types';
import { EditContaForm } from './EditContaForm';

interface StatusControlProps {
  currentStatus: ContaPagarStatus;
  currentDataVencimento: string;
  editing: boolean;
  newStatus: ContaPagarStatus;
  newDataPagamento?: string;
  loading: boolean;
  onStartEdit: () => void;
  onStatusChange: (status: ContaPagarStatus) => void;
  onDataPagamentoChange?: (data: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paga':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'vencida':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-yellow-500" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'paga': return 'Paga';
    case 'vencida': return 'Vencida';
    case 'cancelada': return 'Cancelada';
    default: return status;
  }
};

export function StatusControl({
  currentStatus,
  currentDataVencimento,
  editing,
  newStatus,
  newDataPagamento,
  loading,
  onStartEdit,
  onStatusChange,
  onDataPagamentoChange,
  onSave,
  onCancel
}: StatusControlProps) {
  if (editing) {
    return (
      <div className="w-full">
        <EditContaForm
          currentStatus={currentStatus}
          currentDataVencimento={currentDataVencimento}
          newStatus={newStatus}
          loading={loading}
          onStatusChange={onStatusChange}
          onSave={onSave}
          onCancel={onCancel}
          // novas props
          newDataPagamento={newDataPagamento || ''}
          onDataPagamentoChange={onDataPagamentoChange!}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon(currentStatus)}
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        currentStatus === 'paga' ? 'bg-green-100 text-green-800' :
        currentStatus === 'vencida' ? 'bg-red-100 text-red-800' :
        currentStatus === 'cancelada' ? 'bg-gray-100 text-gray-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {getStatusLabel(currentStatus)}
      </span>
      <button
        onClick={onStartEdit}
        className="p-1 text-gray-400 hover:text-gray-600"
        title="Alterar status"
      >
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  );
}
