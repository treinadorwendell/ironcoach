'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { sounds } from '@/lib/sound';
import { vibration } from '@/lib/vibration';
import { notificationService } from '@/lib/notification';
import {
  Timer,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Bell,
  BellRing,
  BellOff,
  Check,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface RestCountdownTimerProps {
  initialSeconds: number;
  exerciseName: string;
  setNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const RestCountdownTimer: React.FC<RestCountdownTimerProps> = ({
  initialSeconds,
  exerciseName,
  setNumber,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalDuration, setTotalDuration] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return notificationService.getPermission();
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(initialSeconds);
  const completedTriggeredRef = useRef<boolean>(false);

  // Store callbacks & dynamic props in refs to prevent timer effect restarts
  const onCompleteRef = useRef(onComplete);
  const isMutedRef = useRef(isMuted);
  const exerciseNameRef = useRef(exerciseName);
  const setNumberRef = useRef(setNumber);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    isMutedRef.current = isMuted;
    exerciseNameRef.current = exerciseName;
    setNumberRef.current = setNumber;
  }, [onComplete, isMuted, exerciseName, setNumber]);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Schedule background notification whenever target time is set/updated
  const scheduleNotification = useCallback(
    (targetTimeMs: number) => {
      if (!exerciseNameRef.current) return;
      notificationService.scheduleRestNotification({
        exerciseName: exerciseNameRef.current,
        setNumber: setNumberRef.current,
        targetTimeMs,
        totalDurationSeconds: totalDuration,
      });
    },
    [totalDuration]
  );

  // Initialize or reset timer when opened or when exercise/set changes
  useEffect(() => {
    if (isOpen) {
      timeLeftRef.current = initialSeconds;
      completedTriggeredRef.current = false;
      const targetTime = new Date().getTime() + initialSeconds * 1000;
      endTimeRef.current = targetTime;
      const initTimer = setTimeout(() => {
        setTimeLeft(initialSeconds);
        setTotalDuration(initialSeconds);
        setIsRunning(true);
      }, 0);
      if (exerciseName) {
        notificationService.scheduleRestNotification({
          exerciseName,
          setNumber,
          targetTimeMs: targetTime,
          totalDurationSeconds: initialSeconds,
        });
      }
      return () => clearTimeout(initTimer);
    } else {
      endTimeRef.current = null;
      completedTriggeredRef.current = false;
      notificationService.cancelRestNotification();
    }
  }, [isOpen, initialSeconds, exerciseName, setNumber]);

  // Request notification permission from the user
  const handleRequestPermission = async () => {
    vibration.lightTap();
    const result = await notificationService.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      showFeedbackToast('🔔 Notificações ativadas! Você será alertado mesmo com o app em 2º plano.');
      if (endTimeRef.current && isRunning) {
        scheduleNotification(endTimeRef.current);
      }
    } else if (result === 'denied') {
      showFeedbackToast('⚠️ Notificações foram negadas nas permissões do navegador.');
    }
  };

  // Test sending a quick notification
  const handleTestNotification = async () => {
    vibration.mediumPulse();
    if (permission !== 'granted') {
      await handleRequestPermission();
      return;
    }
    notificationService.triggerRestNotificationNow(exerciseNameRef.current, setNumberRef.current);
    showFeedbackToast('Alerta de teste enviado com sucesso!');
  };

  // Real-clock timestamp countdown (continues even when mobile/tablet app is minimized or screen locked)
  useEffect(() => {
    if (!isOpen || !isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const syncCountdown = () => {
      if (!endTimeRef.current) return;
      const remainingMs = endTimeRef.current - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      timeLeftRef.current = remainingSecs;
      setTimeLeft(remainingSecs);

      if (remainingSecs <= 0 && !completedTriggeredRef.current) {
        completedTriggeredRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Fire single notification for rest completion
        notificationService.triggerRestNotificationNow(exerciseNameRef.current, setNumberRef.current);

        if (!isMutedRef.current) {
          sounds.playRestCompleteBeep();
        }
        vibration.timerFinished();
        if (onCompleteRef.current) onCompleteRef.current();
      }
    };

    // 1. Local main thread ticker
    timerRef.current = setInterval(syncCountdown, 250);

    // 2. Background worker ticker (does not throttle when tab/app is minimized)
    notificationService.startBackgroundTicker(syncCountdown);

    // 3. Visibility and focus listeners to guarantee zero time drift on return
    const handleVisibilityOrFocus = () => {
      syncCountdown();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      notificationService.stopBackgroundTicker();
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [isOpen, isRunning]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent =
    totalDuration > 0 ? Math.max(0, (timeLeft / totalDuration) * 100) : 0;
  const isFinished = timeLeft === 0;

  return (
    <div className="fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-bottom-6 duration-200">
      <div
        className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-colors ${
          isFinished
            ? 'bg-emerald-950/95 border-emerald-400 ring-2 ring-emerald-400 timer-pulsing shadow-[0_-8px_30px_rgba(16,185,129,0.3)]'
            : 'bg-slate-900/95 border-slate-700 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Header: Exercício, Série e Ações de Notificação / Som / Fechar */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`p-1.5 rounded-xl shrink-0 ${
                isFinished
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              <Timer className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>Descanso: Série #{setNumber}</span>
                {isFinished && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                    TEMPO ESGOTADO!
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 truncate max-w-[190px]">
                {exerciseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Botão de Notificação Push/2º Plano */}
            {permission === 'granted' ? (
              <button
                type="button"
                onClick={handleTestNotification}
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition active:scale-90"
                title="Notificações ativas em segundo plano. Clique para testar alerta."
              >
                <BellRing className="w-4 h-4" />
              </button>
            ) : permission === 'denied' ? (
              <button
                type="button"
                onClick={() =>
                  showFeedbackToast(
                    'Notificações bloqueadas nas permissões do navegador. Habilite nas configurações.'
                  )
                }
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-400 transition"
                title="Notificações bloqueadas no navegador"
              >
                <BellOff className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 animate-pulse transition active:scale-90"
                title="Clique para ativar notificações em segundo plano"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Mudo / Som */}
            <button
              type="button"
              onClick={() => {
                vibration.lightTap();
                setIsMuted(!isMuted);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title={isMuted ? 'Ativar som do bip' : 'Silenciar som'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={() => {
                vibration.lightTap();
                notificationService.cancelRestNotification();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Fechar Cronômetro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Countdown Timer Display & Controls */}
        <div className="py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-black font-mono tracking-tight transition-colors ${
                isFinished
                  ? 'text-emerald-400'
                  : timeLeft <= 5
                  ? 'text-amber-400 animate-pulse'
                  : 'text-white'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Stepper buttons for quick +30s / -15s / Pause */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const nextSecs = Math.max(0, timeLeft - 15);
                const nextEndTime = Date.now() + nextSecs * 1000;
                endTimeRef.current = nextEndTime;
                timeLeftRef.current = nextSecs;
                setTimeLeft(nextSecs);
                scheduleNotification(nextEndTime);
                sounds.playTickSound();
                vibration.lightTap();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition cursor-pointer"
              title="-15 segundos"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => {
                const nextSecs = timeLeft + 30;
                const nextEndTime = Date.now() + nextSecs * 1000;
                endTimeRef.current = nextEndTime;
                timeLeftRef.current = nextSecs;
                completedTriggeredRef.current = false;
                setTimeLeft(nextSecs);
                setTotalDuration((td) => td + 30);
                scheduleNotification(nextEndTime);
                sounds.playTickSound();
                vibration.lightTap();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold active:scale-95 transition cursor-pointer"
              title="+30 segundos"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={() => {
                if (isRunning) {
                  endTimeRef.current = null;
                  notificationService.cancelRestNotification();
                  setIsRunning(false);
                } else {
                  const nextEndTime = Date.now() + timeLeftRef.current * 1000;
                  endTimeRef.current = nextEndTime;
                  scheduleNotification(nextEndTime);
                  setIsRunning(true);
                }
                vibration.mediumPulse();
              }}
              className={`p-2 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer ${
                isRunning
                  ? 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
              title={isRunning ? 'Pausar' : 'Continuar'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFinished
                ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Toast de feedback */}
        {toastMessage && (
          <div className="mt-2 p-1.5 px-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-[11px] text-cyan-200 font-semibold animate-in fade-in duration-150 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Banner de permissão quando pendente */}
        {permission === 'default' && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
              <Bell className="w-3.5 h-3.5 shrink-0 animate-bounce text-amber-400" />
              <span>Avisar quando app estiver minimizado:</span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shrink-0"
            >
              Ativar Notificações
            </button>
          </div>
        )}

        {/* Status quando ativado */}
        {permission === 'granted' && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-emerald-400 font-medium">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              Notificações ativas em segundo plano (tablet/mobile)
            </span>
            <span className="text-slate-500 font-mono">Real-time sync</span>
          </div>
        )}
      </div>
    </div>
  );
};
