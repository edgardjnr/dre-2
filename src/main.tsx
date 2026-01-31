import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Auth
import { AuthProvider } from './contexts/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

// Pages
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import { ActivationCodePage } from './pages/ActivationCodePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import { Dashboard } from './components/Dashboard/Dashboard.tsx';
import { EmpresasList } from './components/Empresas/EmpresasList.tsx';
import { ContasList } from './components/Contas/ContasList.tsx';
import { ContasPagarList } from './components/ContasPagar/ContasPagarList.tsx';
import { LancamentosList } from './components/Lancamentos/LancamentosList.tsx';
import { DREReport } from './components/DRE/DREReport.tsx';
import { ReportsList } from './components/Relatorios/ReportsList.tsx';
import { ConfiguracoesPage } from './components/Configuracoes/ConfiguracoesPage.tsx';

import { AcceptInvitationDisabled } from './components/Convites/AcceptInvitationDisabled';
import SplashScreenTest from './components/ui/SplashScreenTest.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/activation" element={<ActivationCodePage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitationDisabled />} />
          <Route path="/test-splash" element={<SplashScreenTest />} />
          
          {/* Authenticated Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="empresas" element={<EmpresasList />} />
            <Route path="contas" element={<ContasList />} />
            <Route path="lancamentos" element={<Navigate to="/contas-pagar" replace />} />
            <Route path="contas-pagar" element={<ContasPagarList />} />
            <Route path="entradas" element={<LancamentosList title="Entradas" newButtonLabel="Nova Entrada" tipoFiltro="Crédito" fixedTipo="Crédito" />} />
            <Route path="dre" element={<DREReport />} />
            <Route path="relatorios" element={<ReportsList />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />

          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      const registration = await navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      await registration.update();
    } catch {
      return;
    }
  });
}

 
