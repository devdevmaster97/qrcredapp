'use client';

import { FaUserMd } from 'react-icons/fa';
import ConveniosContent from '@/app/components/dashboard/ConveniosContent';

export default function ConveniosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profissionais Conveniados</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-blue-600 flex items-center">
          <FaUserMd className="text-white text-2xl mr-3" />
          <h2 className="text-xl font-bold text-white">Rede de Profissionais e Especialidades</h2>
        </div>

        <div className="p-4">
          <ConveniosContent />
        </div>
      </div>
    </div>
  );
} 