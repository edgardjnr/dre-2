import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { CompanyProvider, useCompany } from './contexts/CompanyContext';

const getPageTitle = (pathname: string) => {
  const titles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/empresas': 'Empresas',
    '/contas': 'Plano de Contas',
    '/contas-pagar': 'Contas a Pagar',
    '/entradas': 'Entradas',
    '/dre': 'DRE - Demonstrativo de Resultados',
    '/relatorios': 'Relatórios',
    '/configuracoes': 'Configurações',

  };
  return titles[pathname] || 'Sistema DRE';
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedCompany } = useCompany();

  console.log('🏠 [DEBUG] AppContent - location:', location.pathname, 'selectedCompany:', selectedCompany);

  if (location.pathname === '/') {
    console.log('🔄 [DEBUG] AppContent - Redirecionando para /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  const toggleSidebar = () => {
    // Em mobile: abre/fecha o sidebar overlay
    // Em desktop: colapsa/expande o sidebar fixo
    if (window.innerWidth < 1024) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        selectedEmpresa={selectedCompany}
      />
      
      <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-all duration-300`}>
        <Header 
          title={getPageTitle(location.pathname)} 
          onToggleSidebar={toggleSidebar}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <CompanyProvider>
      <AppContent />
    </CompanyProvider>
  );
}

export default App;
