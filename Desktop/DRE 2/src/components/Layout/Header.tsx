import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HeaderCompanySelector } from './HeaderCompanySelector';

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Botão de toggle do sidebar - visível em todas as telas */}
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Alternar menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Seletor de Empresas */}
          <HeaderCompanySelector />
          



        </div>
      </div>
    </header>
  );
};
