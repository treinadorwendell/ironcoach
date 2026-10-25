'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  RotateCcw,
  X,
  Video,
  ExternalLink,
  Dumbbell,
} from 'lucide-react';
import { getExerciseImageUrl } from '@/lib/exerciseDatabase';

interface ExerciseMediaPlayerProps {
  images?: string[];
  videoUrl?: string;
  gifUrl?: string;
  exerciseName: string;
  autoPlay?: boolean;
  compact?: boolean;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const ytRegex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = clean.match(ytRegex);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1`;
  }
  return null;
}

export const ExerciseMediaPlayer: React.FC<ExerciseMediaPlayerProps> = ({
  images,
  videoUrl,
  gifUrl,
  exerciseName,
  autoPlay = true,
  compact = false,
}) => {
  const validImages = (images || []).filter(Boolean);
  const cleanVideoUrl = (videoUrl || '').trim();
  const cleanGifUrl = (gifUrl || '').trim();

  const hasVideo = cleanVideoUrl.length > 0;
  const hasGif = cleanGifUrl.length > 0;
  const hasImages = validImages.length > 0;

  // Allow switching between custom video/gif and catalog images if both exist
  const [activeSource, setActiveSource] = useState<'video' | 'gif' | 'images'>(() => {
    if (hasVideo) return 'video';
    if (hasGif) return 'gif';
    return 'images';
  });

  useEffect(() => {
    if (hasVideo) setActiveSource('video');
    else if (hasGif) setActiveSource('gif');
    else setActiveSource('images');
  }, [hasVideo, hasGif]);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeSource !== 'images' || !isPlaying || validImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % validImages.length);
    }, 1150);
    return () => clearInterval(interval);
  }, [activeSource, isPlaying, validImages.length]);

  if (!hasVideo && !hasGif && !hasImages) {
    return null;
  }

  const youtubeEmbed = hasVideo ? getYouTubeEmbedUrl(cleanVideoUrl) : null;
  const safeFrameIndex = currentFrame < validImages.length ? currentFrame : 0;
  const activeRelativePath = validImages[safeFrameIndex] || '';
  const activeUrl = activeRelativePath ? getExerciseImageUrl(activeRelativePath) : '';
  const hasError = activeUrl ? !!failedUrls[activeUrl] : false;

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-lg">
      {/* Top Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            {activeSource === 'video' ? (
              <Video className="w-3.5 h-3.5" />
            ) : (
              <Film className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="text-xs font-bold text-slate-200 truncate">
            {activeSource === 'video'
              ? 'Vídeo Demonstrativo'
              : activeSource === 'gif'
              ? 'GIF Demonstrativo'
              : 'Demonstração do Movimento'}
          </span>

          {activeSource === 'images' && hasImages && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-cyan-300 border border-slate-700 shrink-0">
              {isPlaying ? 'Em reprodução' : 'Pausado'} • Pose {safeFrameIndex + 1}/{validImages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Source Switcher when multiple media types exist */}
          {(Number(hasVideo) + Number(hasGif) + Number(hasImages) > 1) && (
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 mr-1">
              {hasVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSource('video');
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                    activeSource === 'video'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vídeo
                </button>
              )}
              {hasGif && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSource('gif');
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                    activeSource === 'gif'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GIF
                </button>
              )}
              {hasImages && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSource('images');
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                    activeSource === 'images'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Poses
                </button>
              )}
            </div>
          )}

          {activeSource === 'images' && validImages.length > 1 && (
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
          )}
        </div>
      </div>

      {/* Main Media Frame */}
      {activeSource === 'video' && hasVideo ? (
        <div
          className={`relative w-full ${
            compact ? 'h-56 sm:h-64' : 'h-64 sm:h-80 md:h-96'
          } bg-black flex items-center justify-center overflow-hidden`}
        >
          {youtubeEmbed ? (
            <iframe
              src={youtubeEmbed}
              title={`Vídeo - ${exerciseName}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={cleanVideoUrl}
              controls
              autoPlay={autoPlay}
              loop
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          )}
        </div>
      ) : activeSource === 'gif' && hasGif ? (
        <div
          className={`relative w-full ${
            compact ? 'h-56 sm:h-64' : 'h-64 sm:h-80 md:h-96'
          } bg-slate-950 flex items-center justify-center overflow-hidden`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cleanGifUrl}
            alt={`${exerciseName} - GIF`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Demonstração em GIF Animado</span>
          </div>
        </div>
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (validImages.length > 1) {
              setIsPlaying((prev) => !prev);
            }
          }}
          className={`relative w-full ${
            compact ? 'h-48 sm:h-56' : 'h-64 sm:h-80 md:h-96'
          } bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer select-none group`}
        >
          {!hasError && activeUrl ? (
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
              {safeFrameIndex === 0
                ? 'Posição Inicial (Fase 1)'
                : 'Posição Final / Contração (Fase 2)'}
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
      )}
    </div>
  );
};

export interface ExerciseMediaModalData {
  name: string;
  muscleGroup?: string;
  images?: string[];
  videoUrl?: string;
  gifUrl?: string;
}

interface ExerciseMediaModalProps {
  isOpen: boolean;
  exercise: ExerciseMediaModalData | null;
  onClose: () => void;
}

export const ExerciseMediaModal: React.FC<ExerciseMediaModalProps> = ({
  isOpen,
  exercise,
  onClose,
}) => {
  if (!isOpen || !exercise) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl shadow-cyan-950/50 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {exercise.name}
                </h3>
                {exercise.muscleGroup && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <Dumbbell className="w-3 h-3" />
                    <span>{exercise.muscleGroup}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Janela dedicada de reprodução de vídeo, GIF ou poses do exercício
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shrink-0"
            title="Fechar janela de vídeo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Content */}
        <div className="p-4 sm:p-5 bg-slate-950/60">
          <ExerciseMediaPlayer
            exerciseName={exercise.name}
            images={exercise.images}
            videoUrl={exercise.videoUrl}
            gifUrl={exercise.gifUrl}
            autoPlay={true}
            compact={false}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {exercise.videoUrl && !exercise.videoUrl.startsWith('data:') && (
              <a
                href={exercise.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Abrir link original</span>
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold transition active:scale-95 cursor-pointer"
          >
            Fechar Vídeo
          </button>
        </div>
      </div>
    </div>
  );
};
