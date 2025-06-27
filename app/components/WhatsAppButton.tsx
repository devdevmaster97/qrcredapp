'use client';

import React from 'react';

interface WhatsAppButtonProps {
  numero: string;
  mensagem?: string;
  className?: string;
  children?: React.ReactNode;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ 
  numero, 
  mensagem = 'Olá, quero mais informações sobre Antecipação W!',
  className = '',
  children 
}) => {
  const openWhatsApp = () => {
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    
    try {
      // Tenta abrir em uma nova aba
      window.open(url, '_blank');
    } catch (error) {
      // Fallback: redireciona na mesma aba
      window.location.href = url;
    }
  };

  return (
    <button 
      onClick={openWhatsApp}
      className={className}
    >
      {children || 'Fale conosco no WhatsApp'}
    </button>
  );
};

export default WhatsAppButton; 