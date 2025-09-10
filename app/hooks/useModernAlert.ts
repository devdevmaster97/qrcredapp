'use client';

import { useState, useCallback } from 'react';

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isOpen: boolean;
  autoClose?: boolean;
  duration?: number;
}

export const useModernAlert = () => {
  const [alert, setAlert] = useState<AlertState>({
    type: 'info',
    title: '',
    message: '',
    isOpen: false,
    autoClose: true,
    duration: 4000
  });

  const showAlert = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options?: { autoClose?: boolean; duration?: number }
  ) => {
    setAlert({
      type,
      title,
      message,
      isOpen: true,
      autoClose: options?.autoClose ?? true,
      duration: options?.duration ?? 4000
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Métodos de conveniência
  const success = useCallback((title: string, message: string, options?: { autoClose?: boolean; duration?: number }) => {
    showAlert('success', title, message, options);
  }, [showAlert]);

  const error = useCallback((title: string, message: string, options?: { autoClose?: boolean; duration?: number }) => {
    showAlert('error', title, message, options);
  }, [showAlert]);

  const warning = useCallback((title: string, message: string, options?: { autoClose?: boolean; duration?: number }) => {
    showAlert('warning', title, message, options);
  }, [showAlert]);

  const info = useCallback((title: string, message: string, options?: { autoClose?: boolean; duration?: number }) => {
    showAlert('info', title, message, options);
  }, [showAlert]);

  return {
    alert,
    showAlert,
    closeAlert,
    success,
    error,
    warning,
    info
  };
};

export default useModernAlert;
