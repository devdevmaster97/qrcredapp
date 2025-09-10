'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const ModernAlert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  isOpen,
  onClose,
  autoClose = true,
  duration = 4000
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Aguarda animação de saída
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          title: 'text-green-800',
          message: 'text-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          title: 'text-red-800',
          message: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          title: 'text-yellow-800',
          message: 'text-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          title: 'text-blue-800',
          message: 'text-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          title: 'text-gray-800',
          message: 'text-gray-700'
        };
    }
  };

  if (!isOpen) return null;

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`
          relative w-full max-w-md mx-auto transform transition-all duration-300 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div
          className={`
            relative rounded-2xl shadow-2xl border-2 p-6
            ${colors.bg} ${colors.border}
            backdrop-blur-sm
          `}
        >
          {/* Botão de fechar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Conteúdo */}
          <div className="flex items-start space-x-4">
            {/* Ícone */}
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold mb-2 ${colors.title}`}>
                {title}
              </h3>
              <p className={`text-sm leading-relaxed ${colors.message}`}>
                {message}
              </p>
            </div>
          </div>

          {/* Barra de progresso (apenas para auto-close) */}
          {autoClose && (
            <div className="mt-4 w-full bg-white bg-opacity-30 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ease-linear ${
                  type === 'success' ? 'bg-green-500' :
                  type === 'error' ? 'bg-red-500' :
                  type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{
                  width: '100%',
                  animation: `shrink ${duration}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernAlert;
