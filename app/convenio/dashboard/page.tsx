'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaReceipt, FaChartLine, FaUser, FaFileAlt, FaUndo } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface DashboardData {
  totalLancamentos: number;
  totalVendas: number;
  totalEstornos: number;
  totalAssociados: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalLancamentos: 0,
    totalVendas: 0,
    totalEstornos: 0,
    totalAssociados: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Detectar dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Headers anti-cache rigorosos
        const headers: HeadersInit = {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        };

        if (isMobile) {
          console.log('📱 DASHBOARD - Dispositivo móvel detectado, usando headers anti-cache');
        }

        const response = await fetch(`/api/convenio/dashboard?t=${Date.now()}`, {
          method: 'GET',
          headers,
          cache: 'no-store'
        });
        
        const data = await response.json();

        if (data.success) {
          console.log('✅ DASHBOARD - Dados carregados:', {
            totalLancamentos: data.data.totalLancamentos,
            totalVendas: data.data.totalVendas,
            totalEstornos: data.data.totalEstornos,
            totalAssociados: data.data.totalAssociados,
            timestamp: new Date().toISOString()
          });
          setDashboardData(data.data);
        } else {
          console.log('❌ DASHBOARD - Erro da API:', data.message);
          toast.error(data.message || 'Erro ao carregar dados do dashboard');
        }
      } catch (error) {
        console.error('❌ DASHBOARD - Erro ao buscar dados:', error);
        toast.error('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Página Principal</h1>
        <p className="mt-1 text-sm text-gray-600">Visão geral do seu convênio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card de Lançamentos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FaReceipt className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total de Lançamentos</h2>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalLancamentos}</p>
            </div>
          </div>
        </div>

        {/* Card de Vendas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <FaChartLine className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total de Vendas</h2>
              <p className="text-2xl font-semibold text-gray-900">
                {dashboardData.totalVendas.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Card de Estornos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <FaUndo className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total de Estornos</h2>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalEstornos}</p>
            </div>
          </div>
        </div>

        {/* Card de Associados */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <FaUser className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total de Associados</h2>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.totalAssociados}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Ações Rápidas */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/convenio/dashboard/lancamentos/novo" className="flex items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition duration-150">
            <FaReceipt className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-gray-700">Novo Lançamento</span>
          </Link>
          <Link href="/convenio/dashboard/relatorios" className="flex items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition duration-150">
            <FaChartLine className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-gray-700">Relatório de Vendas</span>
          </Link>
          <Link href="/convenio/dashboard/estornos" className="flex items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition duration-150">
            <FaUndo className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-gray-700">Estornos</span>
          </Link>
          <Link href="/convenio/dashboard/meus-dados" className="flex items-center justify-center p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition duration-150">
            <FaUser className="h-5 w-5 text-orange-600 mr-2" />
            <span className="text-gray-700">Meus Dados</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 