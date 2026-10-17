import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DevicesPage } from '@/pages/devices/DevicesPage';

// Placeholders limpos para próximas fases de migração
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
    <h3 className="text-base font-bold text-slate-800">{title}</h3>
    <p className="text-xs text-slate-500">
      Módulo planejado na arquitetura V2. O módulo de Dispositivos já está 100% operacional.
    </p>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas com Layout Base */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/devices" replace />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/dashboard" element={<PlaceholderPage title="Dashboard Geral" />} />
              <Route path="/licenses" element={<PlaceholderPage title="Controle de Licenças & Seriais" />} />
              <Route path="/network-assets" element={<PlaceholderPage title="Gestão de Ativos de Rede" />} />
              <Route path="/users" element={<PlaceholderPage title="Gerenciamento de Usuários e Permissões" />} />
            </Route>
          </Route>

          {/* Rota Fallback */}
          <Route path="*" element={<Navigate to="/devices" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
