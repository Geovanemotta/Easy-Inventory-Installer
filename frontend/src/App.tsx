import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DevicesPage } from '@/pages/devices/DevicesPage';

import { SitesPage } from '@/pages/sites/SitesPage';
import { NetworkAssetsPage } from '@/pages/network-assets/NetworkAssetsPage';
import { AppsPage } from '@/pages/apps/AppsPage';
import { LicensesPage } from '@/pages/licenses/LicensesPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import RemoteAccessPage from '@/pages/remote-access/RemoteAccessPage';
import ActiveDirectoryPage from '@/pages/active-directory/ActiveDirectoryPage';

const ApplicationsRoute: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/devices" replace />;
  }
  return <AppsPage />;
};

const LicensesRoute: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/devices" replace />;
  }
  return <LicensesPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas com Layout Base e 8 Módulos */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/devices" replace />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/network-assets" element={<NetworkAssetsPage />} />
              <Route path="/remote-access" element={<RemoteAccessPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/applications" element={<ApplicationsRoute />} />
              <Route path="/apps" element={<Navigate to="/applications" replace />} />
              <Route path="/software" element={<Navigate to="/applications" replace />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/licenses" element={<LicensesRoute />} />
              <Route path="/ad" element={<ActiveDirectoryPage />} />
              <Route path="/active-directory" element={<ActiveDirectoryPage />} />
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
