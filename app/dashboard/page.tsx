import ConveniosContent from '@/app/components/dashboard/ConveniosContent';
import { FaInfoCircle, FaUserMd } from 'react-icons/fa';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="mt-2 sm:mt-0 text-sm text-gray-600">
          <div className="flex items-center">
            <FaInfoCircle className="mr-1" />
            <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6">
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-blue-600 flex items-center">
            <FaUserMd className="text-white text-2xl mr-3" />
            <h2 className="text-xl font-bold text-white">Saúde Familiar Rede Conveniada</h2>
          </div>
          <div className="p-4">
            <ConveniosContent />
          </div>
        </section>

        <section className="bg-white p-4 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Dicas de Uso</h2>
          
          <div className="space-y-3">
            <article className="p-3 bg-blue-50 rounded-md border border-blue-100">
              <h3 className="font-medium text-blue-800">Controle seus gastos</h3>
              <p className="text-sm text-gray-600">
                Acompanhe seus gastos regularmente para manter o controle financeiro.
              </p>
            </article>
            
            <article className="p-3 bg-green-50 rounded-md border border-green-100">
              <h3 className="font-medium text-green-800">Confira novos convênios</h3>
              <p className="text-sm text-gray-600">
                Novos convênios são adicionados frequentemente. Confira a lista completa.
              </p>
            </article>
            
            <article className="p-3 bg-purple-50 rounded-md border border-purple-100">
              <h3 className="font-medium text-purple-800">Use o QR Code para pagamentos rápidos</h3>
              <p className="text-sm text-gray-600">
                Seu QR Code pode ser usado para pagamentos rápidos em estabelecimentos parceiros.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
} 