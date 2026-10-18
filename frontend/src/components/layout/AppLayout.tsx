import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalToastContainer } from '@/components/common/GlobalToastContainer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar Fixa na Lateral Esquerda (h-screen, fixed) */}
      <Sidebar />

      {/* Container Principal Deslocado à Direita da Sidebar (ml-64) */}
      <div className="ml-64 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>

      {/* Sistema Global de Toasts no Canto da Tela */}
      <GlobalToastContainer />
    </div>
  );
};
