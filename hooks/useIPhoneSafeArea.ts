'use client';

import { useEffect, useState } from 'react';

export type IPhoneCutoutType = 'dynamic-island' | 'notch' | 'standard-mobile' | 'none';

export interface IPhoneSafeAreaMetrics {
  cutoutType: IPhoneCutoutType;
  modelLabel: string;
  topInsetPx: number;
  bottomInsetPx: number;
  leftInsetPx: number;
  rightInsetPx: number;
  isPortrait: boolean;
  isIPhoneViewport: boolean;
}

interface IPhoneProfileSpec {
  width: number;
  height: number;
  cutout: 'notch' | 'dynamic-island';
  topInset: number;
  bottomInset: number;
  label: string;
}

/**
 * Perfis oficiais de viewport CSS (pontos lógicos) do iPhone 11 em diante:
 * - Notch: iPhone 11, 11 Pro, 11 Pro Max, 12 mini, 12, 12 Pro, 12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, 14, 14 Plus
 * - Dynamic Island: iPhone 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16, 16 Plus, 16 Pro, 16 Pro Max
 */
const IPHONE_11_PLUS_PROFILES: IPhoneProfileSpec[] = [
  // Dynamic Island models (iPhone 14 Pro -> iPhone 16 Pro Max)
  {
    width: 393,
    height: 852,
    cutout: 'dynamic-island',
    topInset: 59,
    bottomInset: 34,
    label: 'iPhone 14 Pro / 15 / 15 Pro / 16 (Dynamic Island)',
  },
  {
    width: 430,
    height: 932,
    cutout: 'dynamic-island',
    topInset: 59,
    bottomInset: 34,
    label: 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus (Dynamic Island)',
  },
  {
    width: 402,
    height: 874,
    cutout: 'dynamic-island',
    topInset: 62,
    bottomInset: 34,
    label: 'iPhone 16 Pro (Dynamic Island)',
  },
  {
    width: 440,
    height: 956,
    cutout: 'dynamic-island',
    topInset: 62,
    bottomInset: 34,
    label: 'iPhone 16 Pro Max (Dynamic Island)',
  },
  // Notch models (iPhone 11 -> iPhone 14 Plus)
  {
    width: 375,
    height: 812,
    cutout: 'notch',
    topInset: 47,
    bottomInset: 34,
    label: 'iPhone 11 Pro / 12 mini / 13 mini (Notch)',
  },
  {
    width: 414,
    height: 896,
    cutout: 'notch',
    topInset: 48,
    bottomInset: 34,
    label: 'iPhone 11 / 11 Pro Max / XR (Notch)',
  },
  {
    width: 390,
    height: 844,
    cutout: 'notch',
    topInset: 47,
    bottomInset: 34,
    label: 'iPhone 12 / 12 Pro / 13 / 13 Pro / 14 (Notch)',
  },
  {
    width: 428,
    height: 926,
    cutout: 'notch',
    topInset: 47,
    bottomInset: 34,
    label: 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus (Notch)',
  },
];

/**
 * Mede o valor real de env(safe-area-inset-*) reportado pelo WebKit/Blink quando disponível.
 */
function probeNativeSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);' +
    'padding-left:env(safe-area-inset-left,0px);' +
    'padding-right:env(safe-area-inset-right,0px);';

  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const top = parseFloat(computed.paddingTop) || 0;
  const bottom = parseFloat(computed.paddingBottom) || 0;
  const left = parseFloat(computed.paddingLeft) || 0;
  const right = parseFloat(computed.paddingRight) || 0;
  document.body.removeChild(probe);

  return { top, bottom, left, right };
}

export function detectIPhoneSafeArea(): IPhoneSafeAreaMetrics {
  if (typeof window === 'undefined') {
    return {
      cutoutType: 'none',
      modelLabel: 'Desktop / SSR',
      topInsetPx: 0,
      bottomInsetPx: 0,
      leftInsetPx: 0,
      rightInsetPx: 0,
      isPortrait: true,
      isIPhoneViewport: false,
    };
  }

  const vw = Math.round(window.innerWidth);
  const vh = Math.round(window.innerHeight);
  const screenW = Math.round(window.screen?.width || vw);
  const screenH = Math.round(window.screen?.height || vh);

  const isPortrait = vh >= vw;
  const shortEdge = Math.min(vw, vh);
  const longEdge = Math.max(vw, vh);
  const screenShort = Math.min(screenW, screenH);
  const screenLong = Math.max(screenW, screenH);

  const nativeInsets = probeNativeSafeAreaInsets();

  // 1. Se o próprio iOS/PWA já reportou safe-area-inset-top > 20px
  if (nativeInsets.top >= 51 || nativeInsets.left >= 51 || nativeInsets.right >= 51) {
    return {
      cutoutType: 'dynamic-island',
      modelLabel: 'iPhone Dynamic Island (Nativo)',
      topInsetPx: isPortrait ? Math.max(59, Math.round(nativeInsets.top)) : 0,
      bottomInsetPx: Math.max(isPortrait ? 34 : 21, Math.round(nativeInsets.bottom)),
      leftInsetPx: !isPortrait ? Math.max(59, Math.round(nativeInsets.left)) : 0,
      rightInsetPx: !isPortrait ? Math.max(59, Math.round(nativeInsets.right)) : 0,
      isPortrait,
      isIPhoneViewport: true,
    };
  }

  if (nativeInsets.top >= 38 || nativeInsets.left >= 38 || nativeInsets.right >= 38) {
    return {
      cutoutType: 'notch',
      modelLabel: 'iPhone Notch (Nativo)',
      topInsetPx: isPortrait ? Math.max(47, Math.round(nativeInsets.top)) : 0,
      bottomInsetPx: Math.max(isPortrait ? 34 : 21, Math.round(nativeInsets.bottom)),
      leftInsetPx: !isPortrait ? Math.max(47, Math.round(nativeInsets.left)) : 0,
      rightInsetPx: !isPortrait ? Math.max(47, Math.round(nativeInsets.right)) : 0,
      isPortrait,
      isIPhoneViewport: true,
    };
  }

  // 2. Detecção automática por resolução lógica (funciona em PWA, Safari iOS e Preview Mobile)
  // Primeiro busca correspondência exata ou próxima da largura/altura do viewport ou screen
  const exactMatch =
    IPHONE_11_PLUS_PROFILES.find(
      (p) => Math.abs(p.width - shortEdge) <= 2 && Math.abs(p.height - longEdge) <= 140
    ) ||
    IPHONE_11_PLUS_PROFILES.find(
      (p) => Math.abs(p.width - screenShort) <= 2 && Math.abs(p.height - screenLong) <= 20
    );

  if (exactMatch) {
    return {
      cutoutType: exactMatch.cutout,
      modelLabel: exactMatch.label,
      topInsetPx: isPortrait ? exactMatch.topInset : 0,
      bottomInsetPx: isPortrait ? exactMatch.bottomInset : 21,
      leftInsetPx: !isPortrait ? exactMatch.topInset : 0,
      rightInsetPx: !isPortrait ? exactMatch.topInset : 0,
      isPortrait,
      isIPhoneViewport: true,
    };
  }

  // 3. Qualquer viewport mobile na faixa do iPhone 11 ao 16 Pro Max (370px a 445px de largura em retrato)
  if (isPortrait && vw >= 370 && vw <= 445) {
    // Larguras típicas de Dynamic Island: 393, 402, 430, 440 (ou >= 392 com proporção moderna)
    const isDynamicIslandWidth =
      vw === 393 ||
      vw === 402 ||
      vw === 430 ||
      vw === 440 ||
      (vw >= 392 && vw <= 405) ||
      (vw >= 429 && vw <= 445);

    const cutout: IPhoneCutoutType = isDynamicIslandWidth ? 'dynamic-island' : 'notch';
    const topInset = isDynamicIslandWidth ? (vw >= 400 && vw !== 430 ? 62 : 59) : 47;

    return {
      cutoutType: cutout,
      modelLabel: isDynamicIslandWidth
        ? 'iPhone 14 Pro / 15 / 16 (Dynamic Island Auto)'
        : 'iPhone 11 / 12 / 13 / 14 (Notch Auto)',
      topInsetPx: topInset,
      bottomInsetPx: 34,
      leftInsetPx: 0,
      rightInsetPx: 0,
      isPortrait: true,
      isIPhoneViewport: true,
    };
  }

  // 4. Modo paisagem em telas de iPhone 11 a 16 Pro Max (largura entre 780px e 965px e altura <= 445px)
  if (!isPortrait && vh >= 370 && vh <= 445 && vw >= 780 && vw <= 965) {
    const isDynamicIslandHeight =
      vh === 393 || vh === 402 || vh === 430 || vh === 440 || vh >= 429;
    const cutout: IPhoneCutoutType = isDynamicIslandHeight ? 'dynamic-island' : 'notch';
    const sideInset = isDynamicIslandHeight ? 59 : 47;

    return {
      cutoutType: cutout,
      modelLabel: isDynamicIslandHeight
        ? 'iPhone Dynamic Island (Paisagem)'
        : 'iPhone Notch (Paisagem)',
      topInsetPx: 0,
      bottomInsetPx: 21,
      leftInsetPx: sideInset,
      rightInsetPx: sideInset,
      isPortrait: false,
      isIPhoneViewport: true,
    };
  }

  // 5. Outros smartphones compactos (< 370px)
  if (isPortrait && vw < 370) {
    return {
      cutoutType: 'standard-mobile',
      modelLabel: 'Mobile Compacto',
      topInsetPx: Math.max(24, Math.round(nativeInsets.top)),
      bottomInsetPx: Math.max(16, Math.round(nativeInsets.bottom)),
      leftInsetPx: 0,
      rightInsetPx: 0,
      isPortrait: true,
      isIPhoneViewport: false,
    };
  }

  return {
    cutoutType: 'none',
    modelLabel: 'Tablet / Desktop',
    topInsetPx: Math.round(nativeInsets.top),
    bottomInsetPx: Math.round(nativeInsets.bottom),
    leftInsetPx: Math.round(nativeInsets.left),
    rightInsetPx: Math.round(nativeInsets.right),
    isPortrait,
    isIPhoneViewport: false,
  };
}

export function useIPhoneSafeArea(): IPhoneSafeAreaMetrics {
  const [metrics, setMetrics] = useState<IPhoneSafeAreaMetrics>(() => ({
    cutoutType: 'none',
    modelLabel: 'SSR',
    topInsetPx: 0,
    bottomInsetPx: 0,
    leftInsetPx: 0,
    rightInsetPx: 0,
    isPortrait: true,
    isIPhoneViewport: false,
  }));

  useEffect(() => {
    const applyMetrics = () => {
      const detected = detectIPhoneSafeArea();
      setMetrics(detected);

      const root = document.documentElement;
      root.style.setProperty('--sat', `${detected.topInsetPx}px`);
      root.style.setProperty('--sab', `${detected.bottomInsetPx}px`);
      root.style.setProperty('--sal', `${detected.leftInsetPx}px`);
      root.style.setProperty('--sar', `${detected.rightInsetPx}px`);
      root.dataset.iphoneCutout = detected.cutoutType;
      root.dataset.iphoneViewport = detected.isIPhoneViewport ? 'true' : 'false';
    };

    applyMetrics();

    window.addEventListener('resize', applyMetrics);
    window.addEventListener('orientationchange', applyMetrics);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyMetrics);
    }

    return () => {
      window.removeEventListener('resize', applyMetrics);
      window.removeEventListener('orientationchange', applyMetrics);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', applyMetrics);
      }
    };
  }, []);

  return metrics;
}
