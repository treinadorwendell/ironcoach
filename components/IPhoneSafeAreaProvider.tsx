'use client';

import React from 'react';
import { useIPhoneSafeArea } from '@/hooks/useIPhoneSafeArea';

interface IPhoneSafeAreaProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que sincroniza automaticamente as variáveis CSS (--sat, --sab, --sal, --sar)
 * para todos os modelos do iPhone 11 ao iPhone 16 Pro Max (Notch e Dynamic Island)
 * e mantém uma faixa superior dedicada para a barra de status do iOS.
 */
export const IPhoneSafeAreaProvider: React.FC<IPhoneSafeAreaProviderProps> = ({
  children,
}) => {
  const { cutoutType, topInsetPx } = useIPhoneSafeArea();

  return (
    <>
      {/* Escudo fixo da barra de status do iOS (Notch / Dynamic Island) para que o conteúdo ao rolar nunca invada o recorte */}
      {topInsetPx > 0 && cutoutType !== 'none' && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-40 h-[var(--sat)] bg-slate-950/95 backdrop-blur-md border-b border-slate-900/90 pointer-events-none transition-all duration-200"
        />
      )}
      {children}
    </>
  );
};
