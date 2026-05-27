import AntecipacaoContent from '@/app/components/dashboard/AntecipacaoContent';

export default function AntecipacaoPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Antecipação</h1>
      </header>
      <div className="bg-white rounded-lg shadow">
        <AntecipacaoContent />
      </div>
    </div>
  );
} 