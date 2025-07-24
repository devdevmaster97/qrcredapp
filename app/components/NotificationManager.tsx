'use client';

import { useState, useEffect } from 'react';
import { FaBell, FaBellSlash, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

interface NotificationSettings {
  enabled: boolean;
  agendamentoConfirmado: boolean;
  lembrete24h: boolean;
  lembrete1h: boolean;
}

export default function NotificationManager() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    agendamentoConfirmado: true,
    lembrete24h: true,
    lembrete1h: true
  });

  useEffect(() => {
    checkNotificationStatus();
    loadSettings();
  }, []);

  // Verificar status atual das notificações
  const checkNotificationStatus = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
          const registration = await getServiceWorkerRegistration();
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
          console.log('📱 Status da subscription:', subscription ? 'ATIVA' : 'INATIVA');
        } catch (error) {
          console.error('Erro ao verificar subscription:', error);
        }
      }
    }
  };

  // Carregar configurações salvas
  const loadSettings = () => {
    const saved = localStorage.getItem('notification_settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  };

  // Salvar configurações
  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
  };

  // Função auxiliar para obter service worker registration
  const getServiceWorkerRegistration = async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker não suportado neste navegador');
    }

    // Aguardar service worker estar pronto
    await navigator.serviceWorker.ready;
    
    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      console.log('🔄 Service Worker não encontrado, registrando...');
      registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready; // Aguardar estar pronto
      console.log('✅ Service Worker registrado com sucesso');
    }

    if (!registration.active) {
      throw new Error('Service Worker não está ativo');
    }

    return registration;
  };

  // Solicitar permissão para notificações
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notificações não são suportadas neste navegador');
      return;
    }

    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        await subscribeToPush();
        toast.success('Notificações ativadas com sucesso!');
      } else {
        toast.error('Permissão para notificações negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setLoading(false);
    }
  };

  // Registrar subscription no servidor
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications não suportadas');
    }

    try {
      const registration = await getServiceWorkerRegistration();

      // SUBSTITUA PELA SUA CHAVE VAPID REAL!
      // Gere em: https://web-push-codelab.glitch.me/
      const vapidPublicKey = 'BChWQEOWSzn13UVuKKAfRN7M9Ahb029hFkImsQO0l8csgMyNaF0SFjNVvDVbNlnruYep5a-FQ5iz9SnhvEDSydU';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Buscar dados do usuário
      const storedUser = localStorage.getItem('qrcred_user');
      if (!storedUser) {
        throw new Error('Usuário não encontrado');
      }

      const userData = JSON.parse(storedUser);

      // Enviar subscription para o servidor
      const response = await axios.post('/api/push-subscription', {
        subscription,
        userCard: userData.cartao,
        settings
      });

      if (response.data.success) {
        setIsSubscribed(true);
        const newSettings = { ...settings, enabled: true };
        saveSettings(newSettings);
      } else {
        throw new Error('Falha ao registrar subscription');
      }
    } catch (error) {
      console.error('Erro ao registrar push subscription:', error);
      throw error;
    }
  };

  // Desativar notificações
  const unsubscribeFromPush = async () => {
    try {
      setLoading(true);
      
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('📱 Subscription removida do navegador');
      }

      // Remover do servidor
      const storedUser = localStorage.getItem('qrcred_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        await axios.delete('/api/push-subscription', {
          data: { userCard: userData.cartao }
        });
      }

      setIsSubscribed(false);
      const newSettings = { ...settings, enabled: false };
      saveSettings(newSettings);
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast.error('Erro ao desativar notificações');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar configurações específicas
  const updateSettings = async (newSettings: NotificationSettings) => {
    try {
      saveSettings(newSettings);
      
      if (isSubscribed) {
        const storedUser = localStorage.getItem('qrcred_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          await axios.put('/api/push-subscription', {
            userCard: userData.cartao,
            settings: newSettings
          });
        }
      }
      
      toast.success('Configurações atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  // Converter VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!('Notification' in window)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {notificationPermission === 'granted' && isSubscribed ? (
            <FaBell className="text-green-500 w-5 h-5" />
          ) : (
            <FaBellSlash className="text-gray-400 w-5 h-5" />
          )}
          <div>
            <h3 className="font-medium text-gray-900">Notificações de Agendamentos</h3>
            <p className="text-sm text-gray-500">
              {notificationPermission === 'granted' && isSubscribed 
                ? 'Ativas - Você será notificado sobre seus agendamentos'
                : 'Receba alertas quando seus agendamentos forem confirmados'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {notificationPermission === 'granted' && isSubscribed && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Configurações"
            >
              <FaCog className="w-4 h-4" />
            </button>
          )}
          
          {notificationPermission === 'default' || (notificationPermission === 'granted' && !isSubscribed) ? (
            <button
              onClick={requestNotificationPermission}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <FaBell className="w-4 h-4 mr-2" />
              )}
              Ativar Notificações
            </button>
          ) : notificationPermission === 'granted' && isSubscribed ? (
            <button
              onClick={unsubscribeFromPush}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full mr-2" />
              ) : (
                <FaBellSlash className="w-4 h-4 mr-2" />
              )}
              Desativar
            </button>
          ) : (
            <div className="flex items-center text-red-600 text-sm">
              <FaTimes className="w-4 h-4 mr-1" />
              Bloqueadas
            </div>
          )}
        </div>
      </div>

      {/* Configurações Detalhadas */}
      {showSettings && notificationPermission === 'granted' && isSubscribed && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">Configurações de Notificação</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.agendamentoConfirmado}
                onChange={(e) => updateSettings({
                  ...settings,
                  agendamentoConfirmado: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Agendamento confirmado (quando data é definida)
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.lembrete24h}
                onChange={(e) => updateSettings({
                  ...settings,
                  lembrete24h: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Lembrete 24 horas antes do agendamento
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.lembrete1h}
                onChange={(e) => updateSettings({
                  ...settings,
                  lembrete1h: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Lembrete 1 hora antes do agendamento
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Informação sobre permissão negada */}
      {notificationPermission === 'denied' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <div className="flex items-start">
            <div className="text-yellow-600">
              <FaTimes className="w-5 h-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Notificações bloqueadas</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Para ativar, clique no ícone de cadeado na barra de endereço e permita notificações.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 