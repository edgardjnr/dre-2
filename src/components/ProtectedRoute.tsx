import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';


interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading, userProfile } = useAuth();
  const location = useLocation();
  const [profileTimeout, setProfileTimeout] = useState(false);

  console.log('🛡️ [DEBUG] ProtectedRoute - loading:', loading, 'session:', !!session, 'userProfile:', !!userProfile, 'timeout:', profileTimeout);
  console.log('🛡️ [DEBUG] ProtectedRoute - userProfile completo:', userProfile);
  console.log('🛡️ [DEBUG] ProtectedRoute - location:', location.pathname);

  // Timeout para evitar loop infinito aguardando userProfile
  useEffect(() => {
    if (session && !userProfile && !loading) {
      console.log('⏰ [DEBUG] Iniciando timeout para carregamento do perfil...');
      const timer = setTimeout(() => {
        console.log('⚠️ [DEBUG] Timeout atingido - continuando sem perfil completo');
        setProfileTimeout(true);
      }, 3000); // 3 segundos de timeout para melhor performance

      return () => clearTimeout(timer);
    } else {
      setProfileTimeout(false);
    }
  }, [session, userProfile, loading]);

  if (loading) {
    console.log('⏳ [DEBUG] ProtectedRoute - Mostrando loading...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    console.log('🚫 [DEBUG] ProtectedRoute - Sem sessão, redirecionando para login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Aguardar o userProfile ser carregado após o login (com timeout)
  if (session && !userProfile && !profileTimeout) {
    console.log('⏳ [DEBUG] ProtectedRoute - Sessão existe mas perfil ainda não carregado, aguardando...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  console.log('✅ [DEBUG] ProtectedRoute - Renderizando children com perfil carregado');
  return <>{children}</>;
};

export default ProtectedRoute;
