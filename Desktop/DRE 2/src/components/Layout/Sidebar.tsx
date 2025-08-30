import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  DollarSign, 
  BarChart3, 
  Settings,
  Home,
  BookOpen,
  TrendingUp,
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';

const getMenuItems = (isMaster: boolean) => {
  const baseItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/empresas', label: 'Empresas', icon: Building2 },
    { path: '/contas', label: 'Plano de Contas', icon: BookOpen },
    { path: '/lancamentos', label: 'Lançamentos', icon: DollarSign },
    { path: '/contas-pagar', label: 'Contas a Pagar', icon: CreditCard },
    { path: '/dre', label: 'DRE', icon: FileText },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 }
  ];

  // Seção Usuários removida

  // Configurações sempre por último
  baseItems.push({ path: '/configuracoes', label: 'Configurações', icon: Settings });

  return baseItems;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedEmpresa?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, onToggleCollapse, selectedEmpresa }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Usar o hook de permissões apenas se temos empresa selecionada
  const { role } = usePermissions(selectedEmpresa || '');
  const isMaster = role === 'master';
  
  const menuItems = getMenuItems(isMaster);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Botão flutuante sobreposto à borda do sidebar */}
      <button
        onClick={onToggleCollapse}
        className={`hidden lg:block fixed top-1/2 transform -translate-y-1/2 -translate-x-1/2 ${isCollapsed ? 'left-16' : 'left-64'} w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center`}
        title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        <div className="flex items-center justify-center w-full h-full">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </div>
      </button>

      {/* Sidebar para desktop - sempre visível */}
      <div className={`hidden lg:flex fixed left-0 top-0 ${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white h-screen p-4 flex-col z-30 overflow-y-auto transition-all duration-300`}>
        <div className="mb-8">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
            <TrendingUp className="h-8 w-8 text-blue-400" />
            {!isCollapsed && <span className="text-xl font-bold">Sistema DRE</span>}
          </div>
          {!isCollapsed && <p className="text-gray-400 text-sm mt-1">Gestão Financeira</p>}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="bg-gray-800 rounded-lg p-4">
            {!isCollapsed && (
              <div className="text-sm text-gray-300 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{user?.email || 'usuario@email.com'}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-bold">Versão v1.1.4</p>
                      <button
                        onClick={handleLogout}
                        className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Sair"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar para mobile - slide-in */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Header com botão de fechar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">Sistema DRE</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mb-8 -mt-4">Gestão Financeira</p>

          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose} // Fecha o sidebar ao clicar em um item
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{user?.email || 'usuario@email.com'}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-bold">Versão v1.1.4</p>
                      <button
                        onClick={handleLogout}
                        className="p-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Sair"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
