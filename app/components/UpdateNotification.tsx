'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

export default function UpdateNotification() {
  // Estado para controlar se há uma atualização disponível
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // Ref para controlar se uma notificação já está sendo exibida
  const notificationShownRef = useRef(false);
  // Ref para armazenar o ID do toast atual (se houver)
  const currentToastIdRef = useRef<string | null>(null);
  
  // Função para forçar a atualização da aplicação
  const forceUpdate = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Limpar caches do navegador
      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('qrcred-')) {
              console.log('🗑️ Limpando cache:', cacheName);
              return window.caches.delete(cacheName);
            }
          }).filter(Boolean)
        );
      }
      
      // Recarregar a página
      window.location.reload();
    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
      // Recarregar mesmo em caso de erro
      window.location.reload();
    }
  };
  
  // Verificar se há atualizações manualmente
  const checkForUpdates = async () => {
    try {
      // Se já houver uma notificação sendo exibida, não verificar novamente
      if (notificationShownRef.current) {
        console.log('Notificação de atualização já está sendo exibida, ignorando verificação');
        return;
      }
      
      const response = await fetch('/version.json?t=' + new Date().getTime(), { cache: 'no-store' });
      if (response.ok) {
        const currentCache = localStorage.getItem('app_version');
        const data = await response.json();
        
        if (!currentCache || currentCache !== data.version) {
          setUpdateAvailable(true);
          localStorage.setItem('app_version', data.version);
          
          // Mostrar notificação de atualização
          showUpdateNotification(data.notes || 'Nova versão disponível!');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  };
  
  // Mostrar notificação de atualização
  const showUpdateNotification = (message = 'Nova versão disponível!') => {
    // Evitar mostrar notificação duplicada
    if (notificationShownRef.current) {
      console.log('Evitando notificação duplicada');
      return;
    }
    
    // Marcar que uma notificação está sendo exibida
    notificationShownRef.current = true;
    
    // Se houver um toast anterior, remove-o
    if (currentToastIdRef.current) {
      toast.dismiss(currentToastIdRef.current);
    }
    
    // Exibir nova notificação
    const toastId = toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <p>{message}</p>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => {
              forceUpdate();
              toast.dismiss(t.id);
            }}
          >
            Atualizar agora
          </button>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
        id: 'update-notification' // ID fixo para garantir que não haverá duplicação
      }
    );
    
    // Armazenar o ID do toast atual
    currentToastIdRef.current = toastId;
  };

  useEffect(() => {
    // Verificar atualizações quando o componente montar
    checkForUpdates();
    
    // Agendar verificação periódica (a cada 30 minutos)
    const intervalId = setInterval(checkForUpdates, 30 * 60 * 1000);
    
    // Escuta mensagens do Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
        
        // Verificar se já existe uma notificação
        if (!notificationShownRef.current) {
          const notes = event.data.notes || 'Nova versão disponível!';
          showUpdateNotification(notes);
        }
      }
    };
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      // Verificar se há service workers registrados
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          // Enviar mensagem para o service worker verificar atualizações
          registration.active?.postMessage({
            type: 'CHECK_UPDATES'
          });
        }
      });
    }
    
    // Monitorar mudanças de conexão para verificar atualizações quando o usuário estiver online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', checkForUpdates);
      
      // Verificar atualizações quando a aplicação volta a ficar visível
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForUpdates();
        }
      });
    }
    
    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', checkForUpdates);
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  return null;
} 