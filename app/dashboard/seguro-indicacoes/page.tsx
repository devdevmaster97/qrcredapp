import SeguroIndicacoesContent from '@/app/components/dashboard/SeguroIndicacoesContent';
import AuthGuard from '@/app/components/auth/AuthGuard';

export default function SeguroIndicacoesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Seguro Indicações</h1>
      </div>
      <div className="bg-white rounded-lg shadow">
        <AuthGuard>
          <SeguroIndicacoesContent />
        </AuthGuard>
      </div>
    </div>
  );
}
