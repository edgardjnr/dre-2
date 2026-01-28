import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AcceptInvitationDisabled: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center border border-gray-200">
        <div className="flex justify-center mb-3">
          <ShieldAlert className="h-8 w-8 text-orange-600" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Convites desativados</h1>
        <p className="text-sm text-gray-600 mb-4">
          O fluxo de convite por link foi desativado. O acesso agora é feito por criação direta de usuário vinculada à empresa.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Ir para Login
        </Link>
      </div>
    </div>
  );
};

