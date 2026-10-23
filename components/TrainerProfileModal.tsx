'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Dumbbell,
  User as UserIcon,
  Lock,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { TrainerProfile } from '@/types';
import {
  updateTrainerPassword,
  updateTrainerDisplayName,
  getFirebaseAuthErrorMessage,
} from '@/lib/firebase';
import { User } from 'firebase/auth';

interface TrainerProfileModalProps {
  isOpen: boolean;
  isFirstLoginMandatory: boolean;
  initialProfile: TrainerProfile | null;
  currentUser: User | null;
  onClose: () => void;
  onSaveProfile: (profile: TrainerProfile) => void;
}

const CROP_VIEWPORT_SIZE = 180; // px on screen for interactive framing
const OUTPUT_CANVAS_SIZE = 256; // 256x256 square thumbnail output

export const TrainerProfileModal: React.FC<TrainerProfileModalProps> = ({
  isOpen,
  isFirstLoginMandatory,
  initialProfile,
  currentUser,
  onClose,
  onSaveProfile,
}) => {
  const [name, setName] = useState(
    () => initialProfile?.name || currentUser?.displayName || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    () => initialProfile?.logoDataUrl
  );

  // Image Cropper State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Compute cropped 256x256 DataURL from current loaded image, zoom, and pan
  const generateCroppedDataUrl = useCallback(
    (
      img: HTMLImageElement,
      natW: number,
      natH: number,
      currentZoom: number,
      currentPan: { x: number; y: number }
    ): string => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_CANVAS_SIZE;
      canvas.height = OUTPUT_CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Fill background with dark slate in case of transparent PNG
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, OUTPUT_CANVAS_SIZE, OUTPUT_CANVAS_SIZE);

      // Base scale to cover the CROP_VIEWPORT_SIZE square (object-cover behavior)
      const baseScale = Math.max(
        CROP_VIEWPORT_SIZE / natW,
        CROP_VIEWPORT_SIZE / natH
      );
      const effectiveScale = baseScale * currentZoom;

      const renderedW = natW * effectiveScale;
      const renderedH = natH * effectiveScale;

      // Top-left in viewport coordinates
      const viewX = (CROP_VIEWPORT_SIZE - renderedW) / 2 + currentPan.x;
      const viewY = (CROP_VIEWPORT_SIZE - renderedH) / 2 + currentPan.y;

      // Map from CROP_VIEWPORT_SIZE to OUTPUT_CANVAS_SIZE
      const ratio = OUTPUT_CANVAS_SIZE / CROP_VIEWPORT_SIZE;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        viewX * ratio,
        viewY * ratio,
        renderedW * ratio,
        renderedH * ratio
      );

      return canvas.toDataURL('image/jpeg', 0.92);
    },
    []
  );

  // Clamp pan so image always covers the 1:1 square frame
  const clampPan = useCallback(
    (
      candidatePan: { x: number; y: number },
      natSize: { width: number; height: number } | null,
      currentZoom: number
    ) => {
      if (!natSize) return candidatePan;
      const baseScale = Math.max(
        CROP_VIEWPORT_SIZE / natSize.width,
        CROP_VIEWPORT_SIZE / natSize.height
      );
      const renderedW = natSize.width * baseScale * currentZoom;
      const renderedH = natSize.height * baseScale * currentZoom;

      const maxOffsetX = Math.max(0, (renderedW - CROP_VIEWPORT_SIZE) / 2);
      const maxOffsetY = Math.max(0, (renderedH - CROP_VIEWPORT_SIZE) / 2);

      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, candidatePan.x)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, candidatePan.y)),
      };
    },
    []
  );

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        loadedImageRef.current = img;
        const natSize = { width: img.naturalWidth || 256, height: img.naturalHeight || 256 };
        setImageNaturalSize(natSize);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRawImageSrc(resultStr);
        const initialCrop = generateCroppedDataUrl(
          img,
          natSize.width,
          natSize.height,
          1,
          { x: 0, y: 0 }
        );
        if (initialCrop) {
          setLogoDataUrl(initialCrop);
        }
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Pointer / Touch Drag Handlers for framing
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rawImageSrc) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !rawImageSrc) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextPan = clampPan(
      {
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      },
      imageNaturalSize,
      zoom
    );
    setPan(nextPan);
    if (loadedImageRef.current && imageNaturalSize) {
      const cropped = generateCroppedDataUrl(
        loadedImageRef.current,
        imageNaturalSize.width,
        imageNaturalSize.height,
        zoom,
        nextPan
      );
      if (cropped) {
        setLogoDataUrl(cropped);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(3, nextZoom));
    const nextPan = clampPan(pan, imageNaturalSize, clampedZoom);
    setZoom(clampedZoom);
    setPan(nextPan);
    if (loadedImageRef.current && imageNaturalSize) {
      const cropped = generateCroppedDataUrl(
        loadedImageRef.current,
        imageNaturalSize.width,
        imageNaturalSize.height,
        clampedZoom,
        nextPan
      );
      if (cropped) {
        setLogoDataUrl(cropped);
      }
    }
  };

  const handleResetToDefaultLogo = () => {
    setRawImageSrc(null);
    setImageNaturalSize(null);
    setLogoDataUrl(undefined);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPasswordNotice(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('O campo Nome é obrigatório para identificar o treinador.');
      return;
    }

    const cleanPassword = password.trim();
    if (cleanPassword.length > 0 && cleanPassword.length < 6) {
      setErrorMessage('Para alterar a senha, informe pelo menos 6 caracteres (ou deixe o campo em branco).');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Firebase Auth displayName
      await updateTrainerDisplayName(cleanName);

      // 2. If optional password was provided, attempt to update password in Firebase Auth
      if (cleanPassword.length >= 6) {
        try {
          await updateTrainerPassword(cleanPassword);
          setPasswordNotice('Senha atualizada com sucesso!');
        } catch (pwdErr: unknown) {
          const code = (pwdErr as { code?: string })?.code || '';
          if (code === 'auth/requires-recent-login') {
            setErrorMessage(
              'Por segurança do Firebase, para alterar a senha é necessário ter feito login recentemente. Seu Nome e Logo foram salvos normalmente.'
            );
          } else {
            setErrorMessage(getFirebaseAuthErrorMessage(pwdErr));
            setIsSaving(false);
            return;
          }
        }
      }

      // 3. Save TrainerProfile (Name + Cropped Logo)
      const updatedProfile: TrainerProfile = {
        name: cleanName,
        logoDataUrl: logoDataUrl || undefined,
        isProfileCompleted: true,
        updatedAt: new Date().toISOString(),
      };

      onSaveProfile(updatedProfile);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível salvar o perfil.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Compute CSS preview scale for the interactive cropper box
  const getCropRenderMetrics = () => {
    if (!imageNaturalSize) return { width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE };
    const baseScale = Math.max(
      CROP_VIEWPORT_SIZE / imageNaturalSize.width,
      CROP_VIEWPORT_SIZE / imageNaturalSize.height
    );
    return {
      width: imageNaturalSize.width * baseScale * zoom,
      height: imageNaturalSize.height * baseScale * zoom,
    };
  };

  const cropMetrics = getCropRenderMetrics();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Miniatura IronCoach Preview */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30 flex-shrink-0">
              {logoDataUrl ? (
                <img
                  src={logoDataUrl}
                  alt="Logo do Treinador"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Dumbbell className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Perfil do Treinador
                </h2>
                {isFirstLoginMandatory && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    1º Acesso
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFirstLoginMandatory
                  ? 'Informe seu nome para personalizar o IronCoach (senha e logo são opcionais).'
                  : 'Personalize seu nome, senha de acesso e a logo da miniatura IronCoach.'}
              </p>
            </div>
          </div>

          {!isFirstLoginMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
              title="Fechar Perfil"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {passwordNotice && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordNotice}</span>
            </div>
          )}

          {/* Live Preview of the IronCoach Button in Client Tab */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 ring-1 ring-white/10 shrink-0">
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt="Miniatura IronCoach"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Dumbbell className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
                  IronCoach
                </span>
                <span className="text-xs font-bold text-emerald-400 truncate block mt-0.5">
                  {name.trim() || 'Nome do Treinador'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
              Prévia do Botão
            </span>
          </div>

          {/* 1. Nome: (Obrigatório) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nome: *</span>
              </span>
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                Obrigatório
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Treinador Carlos Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            <p className="text-[11px] text-slate-400">
              Este nome aparecerá logo abaixo do título <strong className="text-slate-300">IronCoach</strong>.
            </p>
          </div>

          {/* 2. Senha: (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Senha:</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Opcional
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Deixe em branco para manter a senha atual (mín. 6 dígitos)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Mudar logo: (Opcional com Recorte e Enquadramento igual à miniatura) */}
          <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mudar logo:</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                Opcional • Recorte 1:1 igual à miniatura
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{logoDataUrl ? 'Escolher Outra Imagem' : 'Selecionar Logo do Dispositivo'}</span>
              </button>

              {logoDataUrl && (
                <button
                  type="button"
                  onClick={handleResetToDefaultLogo}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-800 hover:border-rose-500/30 transition active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Usar Ícone Padrão</span>
                </button>
              )}
            </div>

            {/* Interactive 1:1 Square Cropper matching the IronCoach Thumbnail */}
            {rawImageSrc && imageNaturalSize && (
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Move className="w-3.5 h-3.5 text-emerald-400" />
                    Arraste a imagem para enquadrar na miniatura
                  </span>
                  <span className="text-slate-400 font-mono">
                    Zoom: {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* 1:1 Rounded-2XL Viewport identical to IronCoach Thumbnail */}
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      width: `${CROP_VIEWPORT_SIZE}px`,
                      height: `${CROP_VIEWPORT_SIZE}px`,
                    }}
                    className={`relative rounded-2xl overflow-hidden bg-slate-900 ring-2 ring-emerald-500/60 shadow-xl select-none touch-none shrink-0 ${
                      isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                  >
                    <img
                      src={rawImageSrc}
                      alt="Recorte da logo"
                      draggable={false}
                      style={{
                        width: `${cropMetrics.width}px`,
                        height: `${cropMetrics.height}px`,
                        left: `${(CROP_VIEWPORT_SIZE - cropMetrics.width) / 2 + pan.x}px`,
                        top: `${(CROP_VIEWPORT_SIZE - cropMetrics.height) / 2 + pan.y}px`,
                      }}
                      className="absolute max-w-none pointer-events-none select-none"
                    />
                    {/* Subtle Framing Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none border border-white/15 rounded-2xl grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-white/10" />
                      <div className="border-r border-white/10" />
                      <div />
                    </div>
                  </div>

                  {/* Zoom Controls & Real-Size Thumbnail Comparison */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        Ajustar Zoom do Enquadramento
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleZoomChange(zoom - 0.15)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Diminuir zoom"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.02}
                          value={zoom}
                          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                          className="flex-1 accent-emerald-500 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => handleZoomChange(zoom + 0.15)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Aumentar zoom"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 shadow-md ring-1 ring-emerald-400/30 shrink-0">
                        {logoDataUrl && (
                          <img
                            src={logoDataUrl}
                            alt="Resultado em tamanho real"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        <strong className="text-slate-200 block">Tamanho Real da Miniatura</strong>
                        Recortada e enquadrada no formato exato do ícone IronCoach.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit & Cancel Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            {!isFirstLoginMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/60 border border-emerald-400/30 active:scale-95 transition disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Perfil...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isFirstLoginMandatory ? 'Concluir e Acessar IronCoach' : 'Salvar Perfil do Treinador'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
