import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalToastContainer } from '@/components/common/GlobalToastContainer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex">
      {/* Sidebar Fixa na Lateral Esquerda (h-screen, fixed) */}
      <Sidebar />

      {/* Container Principal Deslocado à Direita da Sidebar (ml-64) */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col bg-[#0B0E14]">
        <Header />
        <main className="flex-1 p-6 overflow-x-auto bg-[#0B0E14]">
          <Outlet />
        </main>
      </div>

      {/* Sistema Global de Toasts no Canto da Tela */}
      <GlobalToastContainer />
    </div>
  );
};
