import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Edit3 } from 'lucide-react';
import { ContaPagarStatus } from '../../../types';

interface StatusControlProps {
  currentStatus: ContaPagarStatus;
  editingStatus: boolean;
  newStatus: ContaPagarStatus;
  loading: boolean;
  onStartEdit: () => void;
  onStatusChange: (status: ContaPagarStatus) => void;
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
  editingStatus,
  newStatus,
  loading,
  onStartEdit,
  onStatusChange,
  onSave,
  onCancel
}: StatusControlProps) {
  if (editingStatus) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
        <select
          value={newStatus}
          onChange={(e) => onStatusChange(e.target.value as ContaPagarStatus)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
        >
          <option value="pendente">Pendente</option>
          <option value="paga">Paga</option>
          <option value="vencida">Vencida</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <div className="flex space-x-2">
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
          >
            Cancelar
          </button>
        </div>
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