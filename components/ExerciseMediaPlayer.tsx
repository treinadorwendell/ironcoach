'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Film, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { getExerciseImageUrl } from '@/lib/exerciseDatabase';

interface ExerciseMediaPlayerProps {
  images?: string[];
  exerciseName: string;
  autoPlay?: boolean;
  compact?: boolean;
}

export const ExerciseMediaPlayer: React.FC<ExerciseMediaPlayerProps> = ({
  images,
  exerciseName,
  autoPlay = true,
  compact = false,
}) => {
  const validImages = (images || []).filter(Boolean);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isPlaying || validImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % validImages.length);
    }, 1150);
    return () => clearInterval(interval);
  }, [isPlaying, validImages.length]);

  if (validImages.length === 0) {
    return null;
  }

  const safeFrameIndex = currentFrame < validImages.length ? currentFrame : 0;
  const activeRelativePath = validImages[safeFrameIndex];
  const activeUrl = getExerciseImageUrl(activeRelativePath);
  const hasError = !!failedUrls[activeUrl];

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-lg">
      {/* Top Bar */}
      <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Film className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-slate-200 truncate">
            Demonstração do Movimento
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-cyan-300 border border-slate-700 shrink-0">
            {isPlaying ? 'Em reprodução' : 'Pausado'} • Pose {safeFrameIndex + 1}/{validImages.length}
          </span>
        </div>

        {validImages.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying((prev) => !prev);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition active:scale-95 cursor-pointer border ${
                isPlaying
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Animar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Media Frame */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (validImages.length > 1) {
            setIsPlaying((prev) => !prev);
          }
        }}
        className={`relative w-full ${
          compact ? 'h-48 sm:h-56' : 'h-60 sm:h-72 md:h-80'
        } bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer select-none group`}
      >
        {!hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeUrl}
            alt={`${exerciseName} - Pose ${safeFrameIndex + 1}`}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedUrls((prev) => ({
                ...prev,
                [activeUrl]: true,
              }))
            }
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
            <ImageIcon className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-semibold">
              Mídia indisponível no momento para esta pose
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFailedUrls({});
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-cyan-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Frame Badge Overlay */}
        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 shadow">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>
            {safeFrameIndex === 0 ? 'Posição Inicial (Fase 1)' : 'Posição Final / Contração (Fase 2)'}
          </span>
        </div>

        {/* Manual Frame Selector Pills */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-800">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  setCurrentFrame(idx);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  safeFrameIndex === idx
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pose {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
