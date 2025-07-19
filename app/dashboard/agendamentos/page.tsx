'use client';

import { FaCalendarAlt } from 'react-icons/fa';
import AgendamentosContent from '@/app/components/dashboard/AgendamentosContent';

export default function AgendamentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Meus Agendamentos</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-blue-600 flex items-center">
          <FaCalendarAlt className="text-white text-2xl mr-3" />
          <h2 className="text-xl font-bold text-white">Histórico de Agendamentos</h2>
        </div>

        <div className="p-4">
          <AgendamentosContent />
        </div>
      </div>
    </div>
  );
} 