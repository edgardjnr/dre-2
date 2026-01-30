import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Auth
import { AuthProvider } from './contexts/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import PWAInstallProvider from './components/PWAInstallProvider.tsx';

// Pages
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage.tsx';
import { ActivationCodePage } from './pages/ActivationCodePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import { Dashboard } from './components/Dashboard/Dashboard.tsx';
import { EmpresasList } from './components/Empresas/EmpresasList.tsx';
import { ContasList } from './components/Contas/ContasList.tsx';
import { LancamentosList } from './components/Lancamentos/LancamentosList.tsx';
import { ContasPagarList } from './components/ContasPagar/ContasPagarList.tsx';
import { DREReport } from './components/DRE/DREReport.tsx';
import { ReportsList } from './components/Relatorios/ReportsList.tsx';
import { ConfiguracoesPage } from './components/Configuracoes/ConfiguracoesPage.tsx';

import { AcceptInvitationDisabled } from './components/Convites/AcceptInvitationDisabled';
import { SupabaseConnectionTest } from './components/SupabaseConnectionTest.tsx';
import SplashScreenTest from './components/ui/SplashScreenTest.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PWAInstallProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/activation" element={<ActivationCodePage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitationDisabled />} />
          <Route path="/test-connection" element={<SupabaseConnectionTest />} />
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
            <Route path="lancamentos" element={<LancamentosList />} />
            <Route path="contas-pagar" element={<ContasPagarList />} />
            <Route path="dre" element={<DREReport />} />
            <Route path="relatorios" element={<ReportsList />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />

          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </PWAInstallProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  const registerSW = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);

      // Force check for updates on load
      try { registration.update(); } catch {}

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Auto-apply the new version without prompt
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  };

  window.addEventListener('load', registerSW);

  // Reload once the new SW takes control
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
