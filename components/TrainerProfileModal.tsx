'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  LogOut,
  Settings,
  Video,
  Link2,
  Film,
  Search,
  Plus,
  Trash2,
  Edit3,
  Layers,
  ArrowLeft,
  ChevronRight,
  Play,
  Utensils,
} from 'lucide-react';
import {
  TrainerProfile,
  MuscleGroup,
  MUSCLE_GROUPS,
  DatabaseExercise,
  CustomWorkoutMethod,
  CustomWorkoutMethodSubSetTemplate,
  NutritionFoodItem,
  NutritionProfessionalLibrary,
} from '@/types';
import {
  updateTrainerPassword,
  updateTrainerDisplayName,
  getFirebaseAuthErrorMessage,
  cloudSync,
} from '@/lib/firebase';
import { storage } from '@/lib/storage';
import {
  ANATOMY_MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  formatAnatomyMuscle,
  formatEquipment,
} from '@/lib/exerciseDatabase';
import { ExerciseMediaModal, ExerciseMediaModalData } from '@/components/ExerciseMediaPlayer';
import { ProfessionalNutritionPanel } from '@/components/ProfessionalNutritionPanel';
import { loadOfficialNutritionDatabase } from '@/lib/nutritionEngine';
import { User } from 'firebase/auth';

interface TrainerProfileModalProps {
  isOpen: boolean;
  isFirstLoginMandatory: boolean;
  initialProfile: TrainerProfile | null;
  currentUser: User | null;
  onClose: () => void;
  onSaveProfile: (profile: TrainerProfile) => void;
  onLogout?: () => void;
}

const CROP_VIEWPORT_SIZE = 180; // px on screen for interactive framing
const OUTPUT_CANVAS_SIZE = 256; // 256x256 square thumbnail output
const MAX_VIDEO_DURATION_SECONDS = 30;

type MainSettingsTab = 'perfil' | 'treino' | 'dieta';
type WorkoutSubTab = 'criar-exercicio' | 'editar-exercicio' | 'metodo-avancado';
type MobileNavView =
  | 'main-cards'
  | 'perfil'
  | 'treino-cards'
  | 'criar-exercicio'
  | 'editar-exercicio'
  | 'metodo-avancado'
  | 'dieta';

type MediaInputMode = 'none' | 'video_upload' | 'video_link' | 'gif';

export const TrainerProfileModal: React.FC<TrainerProfileModalProps> = ({
  isOpen,
  isFirstLoginMandatory,
  initialProfile,
  currentUser,
  onClose,
  onSaveProfile,
  onLogout,
}) => {
  // Navigation state (Desktop tabs + Mobile/Tablet large cards)
  const [activeMainTab, setActiveMainTab] = useState<MainSettingsTab>('perfil');
  const [activeWorkoutSubTab, setActiveWorkoutSubTab] =
    useState<WorkoutSubTab>('criar-exercicio');
  const [mobileNavView, setMobileNavView] = useState<MobileNavView>('main-cards');

  // Nutrition Library State (Configurações da Dieta)
  const [nutritionLibrary, setNutritionLibrary] = useState<NutritionProfessionalLibrary>(() =>
    storage.getNutritionLibrary()
  );
  const [allNutritionFoods, setAllNutritionFoods] = useState<NutritionFoodItem[]>([]);

  // Profile State
  const [name, setName] = useState(
    () => initialProfile?.name || currentUser?.displayName || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    () => initialProfile?.logoDataUrl
  );

  // Sync profile fields and nutrition database when reopened
  useEffect(() => {
    if (isOpen) {
      setName(initialProfile?.name || currentUser?.displayName || '');
      setLogoDataUrl(initialProfile?.logoDataUrl);
      setNutritionLibrary(storage.getNutritionLibrary());
      loadOfficialNutritionDatabase().then((foods) => {
        setAllNutritionFoods(foods);
      });
      if (isFirstLoginMandatory) {
        setActiveMainTab('perfil');
        setMobileNavView('perfil');
      }
    }
  }, [isOpen, initialProfile, currentUser, isFirstLoginMandatory]);

  const handleSaveNutritionLibrary = (updated: NutritionProfessionalLibrary) => {
    setNutritionLibrary(updated);
    storage.saveNutritionLibrary(updated);
    cloudSync.syncNutritionLibrary(updated);
  };

  // Image Cropper State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
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

  // Status & Feedback (Profile)
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // ============================================================================
  // WORKOUT SETTINGS STATE: 1. CRIAR EXERCÍCIO NO BANCO
  // ============================================================================
  const [exerciseDb, setExerciseDb] = useState<DatabaseExercise[]>(() =>
    storage.getExerciseDatabase()
  );

  const [newExName, setNewExName] = useState('');
  const [newExMuscleGroup, setNewExMuscleGroup] = useState<MuscleGroup>('Peitoral');
  const [newExPrimaryMuscle, setNewExPrimaryMuscle] = useState<string>('peito');
  const [newExSecondaryMuscle, setNewExSecondaryMuscle] = useState<string>('triceps');
  const [newExEquipment, setNewExEquipment] = useState<string>('barra');
  const [newExMediaMode, setNewExMediaMode] = useState<MediaInputMode>('video_upload');
  const [newExVideoDataUrl, setNewExVideoDataUrl] = useState<string>('');
  const [newExVideoDuration, setNewExVideoDuration] = useState<number | null>(null);
  const [newExVideoFileName, setNewExVideoFileName] = useState<string>('');
  const [newExVideoLink, setNewExVideoLink] = useState<string>('');
  const [newExGifUrl, setNewExGifUrl] = useState<string>('');
  const [newExFeedback, setNewExFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCheckingNewVideo, setIsCheckingNewVideo] = useState(false);
  const newVideoInputRef = useRef<HTMLInputElement | null>(null);
  const newGifInputRef = useRef<HTMLInputElement | null>(null);

  // ============================================================================
  // WORKOUT SETTINGS STATE: 2. EDITAR EXERCÍCIO DO BANCO
  // ============================================================================
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editMuscleFilter, setEditMuscleFilter] = useState<'Todos' | MuscleGroup>('Todos');
  const [selectedExToEdit, setSelectedExToEdit] = useState<DatabaseExercise | null>(null);

  const [editExName, setEditExName] = useState('');
  const [editExMuscleGroup, setEditExMuscleGroup] = useState<MuscleGroup>('Peitoral');
  const [editExPrimaryMuscle, setEditExPrimaryMuscle] = useState<string>('');
  const [editExSecondaryMuscle, setEditExSecondaryMuscle] = useState<string>('');
  const [editExEquipment, setEditExEquipment] = useState<string>('');
  const [editExMediaMode, setEditExMediaMode] = useState<MediaInputMode>('video_upload');
  const [editExVideoDataUrl, setEditExVideoDataUrl] = useState<string>('');
  const [editExVideoDuration, setEditExVideoDuration] = useState<number | null>(null);
  const [editExVideoFileName, setEditExVideoFileName] = useState<string>('');
  const [editExVideoLink, setEditExVideoLink] = useState<string>('');
  const [editExGifUrl, setEditExGifUrl] = useState<string>('');
  const [editExFeedback, setEditExFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCheckingEditVideo, setIsCheckingEditVideo] = useState(false);
  const editVideoInputRef = useRef<HTMLInputElement | null>(null);
  const editGifInputRef = useRef<HTMLInputElement | null>(null);

  // Separate Video Preview Modal State
  const [previewMediaModalEx, setPreviewMediaModalEx] =
    useState<ExerciseMediaModalData | null>(null);

  // ============================================================================
  // WORKOUT SETTINGS STATE: 3. MÉTODO AVANÇADO
  // ============================================================================
  const [customMethods, setCustomMethods] = useState<CustomWorkoutMethod[]>(() =>
    storage.getCustomMethods()
  );
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [methodName, setMethodName] = useState('');
  const [methodHasSubSets, setMethodHasSubSets] = useState<boolean>(true);
  const [methodSubSetsTemplate, setMethodSubSetsTemplate] = useState<
    CustomWorkoutMethodSubSetTemplate[]
  >([
    {
      subSetNumber: 1,
      repZone: 'Até a falha',
      note: 'Redução de 20% da carga sem descanso',
    },
  ]);
  const [methodFeedback, setMethodFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExerciseDb(storage.getExerciseDatabase());
      setCustomMethods(storage.getCustomMethods());
    }
  }, [isOpen]);

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

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, OUTPUT_CANVAS_SIZE, OUTPUT_CANVAS_SIZE);

      const baseScale = Math.max(
        CROP_VIEWPORT_SIZE / natW,
        CROP_VIEWPORT_SIZE / natH
      );
      const effectiveScale = baseScale * currentZoom;

      const renderedW = natW * effectiveScale;
      const renderedH = natH * effectiveScale;

      const viewX = (CROP_VIEWPORT_SIZE - renderedW) / 2 + currentPan.x;
      const viewY = (CROP_VIEWPORT_SIZE - renderedH) / 2 + currentPan.y;

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

  // Helper to validate video duration <= 30 seconds and read as DataURL
  const validateAndReadVideoFile = (
    file: File,
    onValidating: (v: boolean) => void,
    onSuccess: (dataUrl: string, durationSec: number, fileName: string) => void,
    onError: (msg: string) => void
  ) => {
    if (!file.type.startsWith('video/')) {
      onError('Por favor, selecione um arquivo de vídeo válido (MP4, WEBM, MOV).');
      return;
    }

    onValidating(true);
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = tempVideo.duration;
      if (isFinite(duration) && duration > MAX_VIDEO_DURATION_SECONDS + 0.5) {
        onValidating(false);
        onError(
          `O vídeo selecionado possui ${duration.toFixed(
            1
          )} segundos. O limite máximo permitido é de ${MAX_VIDEO_DURATION_SECONDS} segundos.`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        onValidating(false);
        onSuccess(
          reader.result as string,
          isFinite(duration) ? Number(duration.toFixed(1)) : 15,
          file.name
        );
      };
      reader.onerror = () => {
        onValidating(false);
        onError('Erro ao processar o arquivo de vídeo.');
      };
      reader.readAsDataURL(file);
    };

    tempVideo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onValidating(false);
      onError('Não foi possível ler os metadados deste vídeo. Tente um arquivo MP4 ou WebM.');
    };

    tempVideo.src = objectUrl;
  };

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
        const natSize = {
          width: img.naturalWidth || 256,
          height: img.naturalHeight || 256,
        };
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
      // ignore
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

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPasswordNotice(null);
    setProfileSuccessMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('O campo Nome é obrigatório para identificar o treinador.');
      return;
    }

    const cleanPassword = password.trim();
    if (cleanPassword.length > 0 && cleanPassword.length < 6) {
      setErrorMessage(
        'Para alterar a senha, informe pelo menos 6 caracteres (ou deixe o campo em branco).'
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateTrainerDisplayName(cleanName);

      if (cleanPassword.length >= 6) {
        try {
          await updateTrainerPassword(cleanPassword);
          setPasswordNotice('Senha atualizada com sucesso!');
          setPassword('');
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

      const updatedProfile: TrainerProfile = {
        name: cleanName,
        logoDataUrl: logoDataUrl || undefined,
        isProfileCompleted: true,
        updatedAt: new Date().toISOString(),
      };

      onSaveProfile(updatedProfile);
      if (isFirstLoginMandatory) {
        onClose();
      } else {
        setProfileSuccessMsg('Perfil do treinador atualizado com sucesso!');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível salvar o perfil.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // HANDLERS: CRIAR EXERCÍCIO NO BANCO
  // ============================================================================
  const handleNewVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewExFeedback(null);
    validateAndReadVideoFile(
      file,
      setIsCheckingNewVideo,
      (dataUrl, duration, fileName) => {
        setNewExVideoDataUrl(dataUrl);
        setNewExVideoDuration(duration);
        setNewExVideoFileName(fileName);
        setNewExFeedback({
          type: 'success',
          text: `Vídeo "${fileName}" (${duration}s) validado com sucesso!`,
        });
      },
      (errMsg) => {
        setNewExFeedback({ type: 'error', text: errMsg });
      }
    );
    e.target.value = '';
  };

  const handleNewGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewExFeedback(null);
    if (!file.type.includes('gif') && !file.type.startsWith('image/')) {
      setNewExFeedback({
        type: 'error',
        text: 'Selecione um arquivo GIF ou imagem animada válida.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewExGifUrl(reader.result as string);
      setNewExFeedback({
        type: 'success',
        text: `Arquivo GIF "${file.name}" carregado com sucesso!`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewExFeedback(null);

    const cleanName = newExName.trim();
    if (!cleanName) {
      setNewExFeedback({
        type: 'error',
        text: 'Informe o nome do exercício para cadastrar no banco.',
      });
      return;
    }

    let videoUrl: string | undefined;
    let gifUrl: string | undefined;
    let mediaType: 'video_upload' | 'video_link' | 'gif' | 'images' | undefined;

    if (newExMediaMode === 'video_upload' && newExVideoDataUrl) {
      videoUrl = newExVideoDataUrl;
      mediaType = 'video_upload';
    } else if (newExMediaMode === 'video_link' && newExVideoLink.trim()) {
      videoUrl = newExVideoLink.trim();
      mediaType = 'video_link';
    } else if (newExMediaMode === 'gif' && newExGifUrl.trim()) {
      gifUrl = newExGifUrl.trim();
      mediaType = 'gif';
    }

    const created = storage.addExerciseToDatabase(cleanName, newExMuscleGroup, {
      primaryMuscles: newExPrimaryMuscle ? [newExPrimaryMuscle] : [],
      secondaryMuscles: newExSecondaryMuscle ? [newExSecondaryMuscle] : [],
      equipment: newExEquipment || 'outros',
      videoUrl,
      gifUrl,
      mediaType,
    });

    cloudSync.syncExerciseDatabase(created);
    setExerciseDb(storage.getExerciseDatabase());

    setNewExName('');
    setNewExVideoDataUrl('');
    setNewExVideoDuration(null);
    setNewExVideoFileName('');
    setNewExVideoLink('');
    setNewExGifUrl('');
    setNewExFeedback({
      type: 'success',
      text: `Exercício "${created.name}" criado e adicionado ao Banco de Exercícios!`,
    });
  };

  // ============================================================================
  // HANDLERS: EDITAR EXERCÍCIO DO BANCO
  // ============================================================================
  const handleSelectExerciseForEdit = (ex: DatabaseExercise) => {
    setSelectedExToEdit(ex);
    setEditExName(ex.name);
    setEditExMuscleGroup(ex.muscleGroup);
    setEditExPrimaryMuscle(ex.primaryMuscles?.[0] || '');
    setEditExSecondaryMuscle(ex.secondaryMuscles?.[0] || '');
    setEditExEquipment(ex.equipment || 'outros');
    setEditExFeedback(null);

    if (ex.mediaType === 'video_upload' || (ex.videoUrl && ex.videoUrl.startsWith('data:'))) {
      setEditExMediaMode('video_upload');
      setEditExVideoDataUrl(ex.videoUrl || '');
      setEditExVideoFileName('Vídeo salvo no exercício');
      setEditExVideoDuration(null);
      setEditExVideoLink('');
      setEditExGifUrl(ex.gifUrl || '');
    } else if (ex.videoUrl) {
      setEditExMediaMode('video_link');
      setEditExVideoLink(ex.videoUrl);
      setEditExVideoDataUrl('');
      setEditExVideoFileName('');
      setEditExGifUrl(ex.gifUrl || '');
    } else if (ex.gifUrl) {
      setEditExMediaMode('gif');
      setEditExGifUrl(ex.gifUrl);
      setEditExVideoDataUrl('');
      setEditExVideoLink('');
    } else {
      setEditExMediaMode('video_upload');
      setEditExVideoDataUrl('');
      setEditExVideoFileName('');
      setEditExVideoDuration(null);
      setEditExVideoLink('');
      setEditExGifUrl('');
    }
  };

  const handleEditVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditExFeedback(null);
    validateAndReadVideoFile(
      file,
      setIsCheckingEditVideo,
      (dataUrl, duration, fileName) => {
        setEditExVideoDataUrl(dataUrl);
        setEditExVideoDuration(duration);
        setEditExVideoFileName(fileName);
        setEditExFeedback({
          type: 'success',
          text: `Vídeo "${fileName}" (${duration}s) carregado! Clique em Salvar Alterações para confirmar.`,
        });
      },
      (errMsg) => {
        setEditExFeedback({ type: 'error', text: errMsg });
      }
    );
    e.target.value = '';
  };

  const handleEditGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditExFeedback(null);
    const reader = new FileReader();
    reader.onload = () => {
      setEditExGifUrl(reader.result as string);
      setEditExFeedback({
        type: 'success',
        text: `GIF "${file.name}" carregado! Clique em Salvar Alterações para confirmar.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEditedExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExToEdit) return;

    const cleanName = editExName.trim();
    if (!cleanName) {
      setEditExFeedback({
        type: 'error',
        text: 'O nome do exercício não pode ficar em branco.',
      });
      return;
    }

    let videoUrl: string | undefined = undefined;
    let gifUrl: string | undefined = undefined;
    let mediaType: 'video_upload' | 'video_link' | 'gif' | 'images' | undefined =
      selectedExToEdit.mediaType;

    if (editExMediaMode === 'video_upload') {
      if (editExVideoDataUrl) {
        videoUrl = editExVideoDataUrl;
        mediaType = 'video_upload';
      }
    } else if (editExMediaMode === 'video_link') {
      if (editExVideoLink.trim()) {
        videoUrl = editExVideoLink.trim();
        mediaType = 'video_link';
      }
    } else if (editExMediaMode === 'gif') {
      if (editExGifUrl.trim()) {
        gifUrl = editExGifUrl.trim();
        mediaType = 'gif';
      }
    }

    const updatedExercise: DatabaseExercise = {
      ...selectedExToEdit,
      name: cleanName,
      muscleGroup: editExMuscleGroup,
      primaryMuscles: editExPrimaryMuscle ? [editExPrimaryMuscle] : [],
      secondaryMuscles: editExSecondaryMuscle ? [editExSecondaryMuscle] : [],
      equipment: editExEquipment || null,
      videoUrl,
      gifUrl,
      mediaType,
      isModified: true,
    };

    const nextDb = storage.updateExerciseInDatabase(updatedExercise);
    cloudSync.syncExerciseDatabase(updatedExercise);
    setExerciseDb(nextDb);
    setSelectedExToEdit(updatedExercise);
    setEditExFeedback({
      type: 'success',
      text: `Alterações salvas com sucesso no exercício "${updatedExercise.name}"!`,
    });
  };

  // ============================================================================
  // HANDLERS: MÉTODO AVANÇADO
  // ============================================================================
  const handleAddTemplateSubSet = () => {
    setMethodSubSetsTemplate((prev) => [
      ...prev,
      {
        subSetNumber: prev.length + 1,
        repZone: 'Até a falha',
        note: `Subsérie #${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveTemplateSubSet = (idx: number) => {
    setMethodSubSetsTemplate((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, subSetNumber: i + 1 }));
    });
  };

  const handleUpdateTemplateSubSet = (
    idx: number,
    field: 'repZone' | 'note',
    value: string
  ) => {
    setMethodSubSetsTemplate((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveCustomMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setMethodFeedback(null);

    const cleanName = methodName.trim();
    if (!cleanName) {
      setMethodFeedback({
        type: 'error',
        text: 'Informe o Nome do Método Avançado.',
      });
      return;
    }

    const saved = storage.addCustomMethod({
      name: cleanName,
      hasSubSets: methodHasSubSets,
      subSetsTemplate: methodHasSubSets
        ? methodSubSetsTemplate.map((s, idx) => ({
            subSetNumber: idx + 1,
            repZone: s.repZone.trim() || 'Até a falha',
            note: s.note.trim(),
          }))
        : [],
    });

    setCustomMethods(storage.getCustomMethods());
    setEditingMethodId(null);
    setMethodName('');
    setMethodHasSubSets(true);
    setMethodSubSetsTemplate([
      {
        subSetNumber: 1,
        repZone: 'Até a falha',
        note: 'Redução de 20% da carga sem descanso',
      },
    ]);
    setMethodFeedback({
      type: 'success',
      text: `Método Avançado "${saved.name}" salvo e disponível nos treinos!`,
    });
  };

  const handleEditCustomMethod = (m: CustomWorkoutMethod) => {
    setEditingMethodId(m.id);
    setMethodName(m.name);
    setMethodHasSubSets(m.hasSubSets);
    setMethodSubSetsTemplate(
      m.subSetsTemplate && m.subSetsTemplate.length > 0
        ? m.subSetsTemplate
        : [
            {
              subSetNumber: 1,
              repZone: 'Até a falha',
              note: 'Subsérie complementar',
            },
          ]
    );
    setMethodFeedback(null);
  };

  const handleDeleteCustomMethod = (id: string) => {
    const next = storage.deleteCustomMethod(id);
    setCustomMethods(next);
    if (editingMethodId === id) {
      setEditingMethodId(null);
      setMethodName('');
    }
  };

  const getCropRenderMetrics = () => {
    if (!imageNaturalSize)
      return { width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE };
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

  // Filtered exercises for Edit Exercise Tab
  const filteredExercisesForEdit = exerciseDb
    .filter((ex) => {
      const matchesMuscle =
        editMuscleFilter === 'Todos' || ex.muscleGroup === editMuscleFilter;
      const q = editSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        (ex.equipment || '').toLowerCase().includes(q);
      return matchesMuscle && matchesSearch;
    })
    .slice(0, 60);

  // ============================================================================
  // RENDER HELPERS FOR SECTIONS
  // ============================================================================
  const renderProfileSection = () => (
    <form onSubmit={handleSubmitProfile} className="space-y-4">
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

      {profileSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {/* Live Preview of the IronCoach Button */}
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
          Prévia do Perfil
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Nome */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nome do Treinador *</span>
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
        </div>

        {/* 2. Senha */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Alterar Senha</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Opcional</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Em branco mantém a atual (mín. 6 dígitos)"
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
      </div>

      {/* 3. Mudar logo */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mudar Logo:</span>
          </label>
          <span className="text-[10px] font-semibold text-slate-400">
            Recorte 1:1 igual à miniatura
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
            <span>
              {logoDataUrl ? 'Escolher Outra Imagem' : 'Selecionar Logo do Dispositivo'}
            </span>
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
                    <strong className="text-slate-200 block">
                      Tamanho Real da Miniatura
                    </strong>
                    Recortada no formato exato do ícone IronCoach.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Sair da Conta & Sessão do Treinador */}
      {currentUser && (
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Treinador Conectado
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate block">
              {currentUser.email || currentUser.displayName || 'Treinador'}
            </span>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition active:scale-95 shrink-0 cursor-pointer"
              title="Sair da conta e trocar de treinador"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair da Conta</span>
            </button>
          )}
        </div>
      )}

      {/* Submit & Cancel Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        {!isFirstLoginMandatory && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Fechar
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
                {isFirstLoginMandatory
                  ? 'Concluir e Acessar IronCoach'
                  : 'Salvar Alterações do Perfil'}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  const renderCreateExerciseSection = () => (
    <form onSubmit={handleCreateExerciseSubmit} className="space-y-4">
      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Banco de Exercícios • Criar Novo Exercício</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina músculos, equipamento e adicione vídeo de até 30s, link ou GIF.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold shrink-0">
          {exerciseDb.length} no banco
        </span>
      </div>

      {newExFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
            newExFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {newExFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{newExFeedback.text}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-slate-200 block mb-1">
            Nome do Exercício *
          </label>
          <input
            type="text"
            required
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
            placeholder="Ex: Supino Inclinado Articulado Unilateral"
            className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1">
            Grupamento do Sistema *
          </label>
          <select
            value={newExMuscleGroup}
            onChange={(e) => setNewExMuscleGroup(e.target.value as MuscleGroup)}
            className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>
                {mg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1">
            Equipamento *
          </label>
          <select
            value={newExEquipment}
            onChange={(e) => setNewExEquipment(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {Object.entries(EQUIPMENT_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-emerald-300 block mb-1">
            Músculo Primário *
          </label>
          <select
            value={newExPrimaryMuscle}
            onChange={(e) => setNewExPrimaryMuscle(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            {Object.entries(ANATOMY_MUSCLE_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-cyan-300 block mb-1">
            Músculo Secundário
          </label>
          <select
            value={newExSecondaryMuscle}
            onChange={(e) => setNewExSecondaryMuscle(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Nenhum músculo secundário</option>
            {Object.entries(ANATOMY_MUSCLE_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Media Selector: Vídeo até 30s, Link de Vídeo ou GIF */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Mídia Demonstrativa do Exercício</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Será aberta em janela separada ao clicar em &ldquo;Ver Vídeo&rdquo;.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setNewExMediaMode('video_upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                newExMediaMode === 'video_upload'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Vídeo até 30s</span>
            </button>
            <button
              type="button"
              onClick={() => setNewExMediaMode('video_link')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                newExMediaMode === 'video_link'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link de Vídeo</span>
            </button>
            <button
              type="button"
              onClick={() => setNewExMediaMode('gif')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                newExMediaMode === 'gif'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>GIF</span>
            </button>
          </div>
        </div>

        {newExMediaMode === 'video_upload' && (
          <div className="space-y-2.5 pt-1">
            <input
              ref={newVideoInputRef}
              type="file"
              accept="video/*"
              onChange={handleNewVideoUpload}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isCheckingNewVideo}
                onClick={() => newVideoInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                {isCheckingNewVideo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-cyan-400" />
                )}
                <span>
                  {newExVideoDataUrl
                    ? 'Trocar Vídeo (Máx. 30s)'
                    : 'Carregar Vídeo de até 30 Segundos'}
                </span>
              </button>

              {newExVideoDataUrl && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMediaModalEx({
                        name: newExName.trim() || 'Prévia do Novo Exercício',
                        muscleGroup: newExMuscleGroup,
                        videoUrl: newExVideoDataUrl,
                      })
                    }
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ver Vídeo em Janela Separada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewExVideoDataUrl('');
                      setNewExVideoDuration(null);
                      setNewExVideoFileName('');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold border border-rose-500/30 hover:bg-rose-500/25 cursor-pointer"
                  >
                    Remover
                  </button>
                </>
              )}
            </div>
            {newExVideoFileName && (
              <p className="text-[11px] text-emerald-400 font-semibold">
                Arquivo pronto: {newExVideoFileName}{' '}
                {newExVideoDuration !== null && `(${newExVideoDuration}s / máx. 30s)`}
              </p>
            )}
          </div>
        )}

        {newExMediaMode === 'video_link' && (
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              Link do Vídeo (YouTube, MP4 ou WebM direto)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={newExVideoLink}
                onChange={(e) => setNewExVideoLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                className="flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              {newExVideoLink.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewMediaModalEx({
                      name: newExName.trim() || 'Prévia do Novo Exercício',
                      muscleGroup: newExMuscleGroup,
                      videoUrl: newExVideoLink.trim(),
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Testar em Janela Separada</span>
                </button>
              )}
            </div>
          </div>
        )}

        {newExMediaMode === 'gif' && (
          <div className="space-y-2.5 pt-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              Link do GIF ou Upload de Arquivo GIF
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newExGifUrl.startsWith('data:') ? '' : newExGifUrl}
                onChange={(e) => setNewExGifUrl(e.target.value)}
                placeholder="Cole o link https://.../exercicio.gif ou carregue do dispositivo"
                className="flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                ref={newGifInputRef}
                type="file"
                accept="image/gif,image/*"
                onChange={handleNewGifUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => newGifInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Carregar GIF</span>
              </button>
              {newExGifUrl.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewMediaModalEx({
                      name: newExName.trim() || 'Prévia do Novo Exercício',
                      muscleGroup: newExMuscleGroup,
                      gifUrl: newExGifUrl.trim(),
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Ver GIF em Janela</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/60 border border-emerald-400/30 flex items-center gap-2 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Criar Exercício no Banco</span>
        </button>
      </div>
    </form>
  );

  const renderEditExerciseSection = () => (
    <div className="space-y-4">
      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>Editar Exercício do Banco de Exercícios</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecione qualquer exercício do banco para carregar vídeo de até 30s, link ou GIF.
            </p>
          </div>
        </div>

        {/* Search & Muscle Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={editSearchQuery}
              onChange={(e) => setEditSearchQuery(e.target.value)}
              placeholder="Buscar exercício pelo nome ou equipamento..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <select
            value={editMuscleFilter}
            onChange={(e) =>
              setEditMuscleFilter(e.target.value as 'Todos' | MuscleGroup)
            }
            className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="Todos">Todos os Grupos Musculares</option>
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>
                {mg}
              </option>
            ))}
          </select>
        </div>

        {/* Exercise Selector List */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {filteredExercisesForEdit.map((ex) => {
            const isSelected = selectedExToEdit?.id === ex.id;
            const hasCustomVideoOrGif = !!(ex.videoUrl || ex.gifUrl);
            return (
              <div
                key={ex.id}
                onClick={() => handleSelectExerciseForEdit(ex)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-white'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold truncate">{ex.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-emerald-400 border border-slate-700">
                      {ex.muscleGroup}
                    </span>
                    {hasCustomVideoOrGif && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                        Vídeo/GIF Ativo
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    {ex.primaryMuscles?.[0] && (
                      <span>Primário: {formatAnatomyMuscle(ex.primaryMuscles[0])}</span>
                    )}
                    {ex.equipment && <span>• Equip.: {formatEquipment(ex.equipment)}</span>}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-bold text-cyan-300 shrink-0">
                  {isSelected ? 'Editando' : 'Selecionar'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Form for Selected Exercise */}
      {selectedExToEdit ? (
        <form
          onSubmit={handleSaveEditedExercise}
          className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                Editando Exercício Selecionado
              </span>
              <h5 className="text-sm font-black text-white">{selectedExToEdit.name}</h5>
            </div>

            {(editExVideoDataUrl ||
              editExVideoLink.trim() ||
              editExGifUrl.trim() ||
              (selectedExToEdit.images && selectedExToEdit.images.length > 0)) && (
              <button
                type="button"
                onClick={() =>
                  setPreviewMediaModalEx({
                    name: editExName.trim() || selectedExToEdit.name,
                    muscleGroup: editExMuscleGroup,
                    videoUrl:
                      editExMediaMode === 'video_upload'
                        ? editExVideoDataUrl
                        : editExMediaMode === 'video_link'
                        ? editExVideoLink.trim()
                        : selectedExToEdit.videoUrl,
                    gifUrl:
                      editExMediaMode === 'gif'
                        ? editExGifUrl.trim()
                        : selectedExToEdit.gifUrl,
                    images: selectedExToEdit.images,
                  })
                }
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ver Vídeo / Mídia</span>
              </button>
            )}
          </div>

          {editExFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                editExFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {editExFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{editExFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Nome do Exercício
              </label>
              <input
                type="text"
                required
                value={editExName}
                onChange={(e) => setEditExName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-emerald-300 block mb-1">
                Músculo Primário
              </label>
              <select
                value={editExPrimaryMuscle}
                onChange={(e) => setEditExPrimaryMuscle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Selecionar músculo primário</option>
                {Object.entries(ANATOMY_MUSCLE_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-cyan-300 block mb-1">
                Músculo Secundário
              </label>
              <select
                value={editExSecondaryMuscle}
                onChange={(e) => setEditExSecondaryMuscle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Nenhum músculo secundário</option>
                {Object.entries(ANATOMY_MUSCLE_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Grupamento do Sistema
              </label>
              <select
                value={editExMuscleGroup}
                onChange={(e) => setEditExMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Equipamento
              </label>
              <select
                value={editExEquipment}
                onChange={(e) => setEditExEquipment(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              >
                {Object.entries(EQUIPMENT_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Media Options for Edited Exercise */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Atualizar Vídeo (até 30s), Link ou GIF</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditExMediaMode('video_upload')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    editExMediaMode === 'video_upload'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  Vídeo até 30s
                </button>
                <button
                  type="button"
                  onClick={() => setEditExMediaMode('video_link')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    editExMediaMode === 'video_link'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  Link de Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setEditExMediaMode('gif')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    editExMediaMode === 'gif'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  GIF
                </button>
              </div>
            </div>

            {editExMediaMode === 'video_upload' && (
              <div className="space-y-2">
                <input
                  ref={editVideoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleEditVideoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isCheckingEditVideo}
                    onClick={() => editVideoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    {isCheckingEditVideo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Carregar Vídeo de até 30s</span>
                  </button>
                  {editExVideoDataUrl && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {editExVideoFileName || 'Vídeo carregado'}{' '}
                      {editExVideoDuration !== null && `(${editExVideoDuration}s)`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {editExMediaMode === 'video_link' && (
              <input
                type="url"
                value={editExVideoLink}
                onChange={(e) => setEditExVideoLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou link direto MP4"
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            )}

            {editExMediaMode === 'gif' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={editExGifUrl.startsWith('data:') ? '' : editExGifUrl}
                  onChange={(e) => setEditExGifUrl(e.target.value)}
                  placeholder="Link https://.../animacao.gif ou carregue um GIF"
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  ref={editGifInputRef}
                  type="file"
                  accept="image/gif,image/*"
                  onChange={handleEditGifUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => editGifInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Arquivo GIF</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Alterações no Exercício</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
          Clique em um exercício da lista acima para editar seus músculos, equipamento ou anexar vídeo de até 30s / link / GIF.
        </div>
      )}
    </div>
  );

  const renderAdvancedMethodSection = () => (
    <div className="space-y-4">
      <form
        onSubmit={handleSaveCustomMethod}
        className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>
                {editingMethodId
                  ? 'Editar Método Avançado'
                  : 'Criar Novo Método Avançado'}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina o nome do método e configure se ele habilita subséries automáticas com escritas na Zona de Repetição e Método.
            </p>
          </div>
          {editingMethodId && (
            <button
              type="button"
              onClick={() => {
                setEditingMethodId(null);
                setMethodName('');
                setMethodHasSubSets(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        {methodFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              methodFeedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            {methodFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{methodFeedback.text}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1">
            Nome do Método Avançado *
          </label>
          <input
            type="text"
            required
            value={methodName}
            onChange={(e) => setMethodName(e.target.value)}
            placeholder="Ex: SST Contração, Drop Duplo Guiado, Back-off Set..."
            className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
          />
        </div>

        {/* Toggle Subséries */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <span className="text-xs font-extrabold text-white block">
                Habilitar Subséries com escritas na Zona de Repetição e Método
              </span>
              <span className="text-[11px] text-slate-400 block">
                Ao selecionar este método na série do treino, as subséries abaixo serão geradas automaticamente.
              </span>
            </div>
            <input
              type="checkbox"
              checked={methodHasSubSets}
              onChange={(e) => setMethodHasSubSets(e.target.checked)}
              className="w-5 h-5 accent-purple-500 rounded cursor-pointer shrink-0"
            />
          </label>

          {methodHasSubSets && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                  Padrão de Subséries do Método ({methodSubSetsTemplate.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddTemplateSubSet}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Subsérie Padrão</span>
                </button>
              </div>

              <div className="space-y-2">
                {methodSubSetsTemplate.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-purple-500/30 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-start gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-extrabold text-[10px] border border-purple-500/40">
                        Sub #{idx + 1}
                      </span>
                      {methodSubSetsTemplate.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplateSubSet(idx)}
                          className="sm:hidden p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Escrita na Zona de Repetição
                      </label>
                      <input
                        type="text"
                        value={sub.repZone}
                        onChange={(e) =>
                          handleUpdateTemplateSubSet(idx, 'repZone', e.target.value)
                        }
                        placeholder="Ex: Até a falha, 6-8 reps"
                        className="w-full h-9 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Escrita no Método / Descrição da Subsérie
                      </label>
                      <input
                        type="text"
                        value={sub.note}
                        onChange={(e) =>
                          handleUpdateTemplateSubSet(idx, 'note', e.target.value)
                        }
                        placeholder="Ex: -20% carga sem descanso, pausa 15s..."
                        className="w-full h-9 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-4">
                      <button
                        type="button"
                        disabled={methodSubSetsTemplate.length <= 1}
                        onClick={() => handleRemoveTemplateSubSet(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                        title="Remover subsérie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {editingMethodId ? 'Atualizar Método Avançado' : 'Salvar Método Avançado'}
            </span>
          </button>
        </div>
      </form>

      {/* List of Custom Methods */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
        <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Métodos Avançados Personalizados ({customMethods.length})
        </h5>
        {customMethods.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum método personalizado criado ainda. Os métodos criados aqui aparecem junto aos métodos nativos na montagem de treino.
          </p>
        ) : (
          <div className="space-y-2">
            {customMethods.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-white">{m.name}</span>
                    {m.hasSubSets ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        {m.subSetsTemplate?.length || 1} subsérie(s) automática(s)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-semibold">
                        Sem subséries
                      </span>
                    )}
                  </div>
                  {m.hasSubSets && m.subSetsTemplate && m.subSetsTemplate.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {m.subSetsTemplate
                        .map(
                          (s, idx) =>
                            `Sub #${idx + 1}: ${s.repZone}${s.note ? ` (${s.note})` : ''}`
                        )
                        .join(' • ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditCustomMethod(m)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition cursor-pointer"
                    title="Editar método"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomMethod(m.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    title="Excluir método"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
        <div
          className={`w-full ${
            isFirstLoginMandatory
              ? 'max-w-lg'
              : activeMainTab === 'dieta'
              ? 'max-w-6xl'
              : 'max-w-4xl'
          } rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 overflow-hidden my-auto max-h-[92vh] flex flex-col`}
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
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
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {isFirstLoginMandatory
                      ? 'Perfil do Treinador'
                      : 'Central de Configuração do Sistema'}
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
                    : 'Gerencie seu perfil, banco de exercícios, métodos avançados e configurações da dieta (alimentos, receitas e medidas POF/IBGE).'}
                </p>
              </div>
            </div>

            {!isFirstLoginMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
                title="Fechar Central de Configuração"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* DESKTOP TOP TABS (lg:flex) */}
          {!isFirstLoginMandatory && (
            <div className="hidden lg:flex flex-col bg-slate-950/90 border-b border-slate-800 px-6 pt-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('perfil');
                    setMobileNavView('perfil');
                  }}
                  className={`px-4 py-2.5 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition cursor-pointer ${
                    activeMainTab === 'perfil'
                      ? 'bg-slate-900 text-emerald-400 border-slate-800'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Editar Perfil (Nome, Senha, Logo, Sair)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('treino');
                    setMobileNavView(activeWorkoutSubTab);
                  }}
                  className={`px-4 py-2.5 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition cursor-pointer ${
                    activeMainTab === 'treino'
                      ? 'bg-slate-900 text-cyan-400 border-slate-800'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações de Treino</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('dieta');
                    setMobileNavView('dieta');
                  }}
                  className={`px-4 py-2.5 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition cursor-pointer ${
                    activeMainTab === 'dieta'
                      ? 'bg-slate-900 text-amber-400 border-slate-800'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  <span>Configurações da Dieta</span>
                </button>
              </div>

              {activeMainTab === 'treino' && (
                <div className="flex items-center gap-2 py-2.5 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveWorkoutSubTab('criar-exercicio');
                      setMobileNavView('criar-exercicio');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                      activeWorkoutSubTab === 'criar-exercicio'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Banco de Exercícios (Criar Exercício)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveWorkoutSubTab('editar-exercicio');
                      setMobileNavView('editar-exercicio');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                      activeWorkoutSubTab === 'editar-exercicio'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Exercício do Banco</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveWorkoutSubTab('metodo-avancado');
                      setMobileNavView('metodo-avancado');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                      activeWorkoutSubTab === 'metodo-avancado'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Método Avançado</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODAL SCROLLABLE CONTENT */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {isFirstLoginMandatory ? (
              renderProfileSection()
            ) : (
              <>
                {/* DESKTOP CONTENT (lg:block) */}
                <div className="hidden lg:block">
                  {activeMainTab === 'perfil' && renderProfileSection()}
                  {activeMainTab === 'treino' &&
                    activeWorkoutSubTab === 'criar-exercicio' &&
                    renderCreateExerciseSection()}
                  {activeMainTab === 'treino' &&
                    activeWorkoutSubTab === 'editar-exercicio' &&
                    renderEditExerciseSection()}
                  {activeMainTab === 'treino' &&
                    activeWorkoutSubTab === 'metodo-avancado' &&
                    renderAdvancedMethodSection()}
                  {activeMainTab === 'dieta' && (
                    <ProfessionalNutritionPanel
                      library={nutritionLibrary}
                      allFoods={allNutritionFoods}
                      onSaveLibrary={handleSaveNutritionLibrary}
                    />
                  )}
                </div>

                {/* TABLET & MOBILE CONTENT (< lg: Menu de Cards Grandes) */}
                <div className="lg:hidden space-y-4">
                  {mobileNavView === 'main-cards' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {/* Card 1: Editar Perfil */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMainTab('perfil');
                          setMobileNavView('perfil');
                        }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-left space-y-3 shadow-lg transition active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <UserIcon className="w-6 h-6" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">
                            Editar Perfil
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Nome, Senha, mudar logo e Sair da conta.
                          </p>
                        </div>
                      </button>

                      {/* Card 2: Configurações de Treino */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMainTab('treino');
                          setMobileNavView('treino-cards');
                        }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-left space-y-3 shadow-lg transition active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                            <Settings className="w-6 h-6" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">
                            Configurações de Treino
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Banco de Exercícios, Editar Exercício e Método Avançado.
                          </p>
                        </div>
                      </button>

                      {/* Card 3: Configurações da Dieta */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMainTab('dieta');
                          setMobileNavView('dieta');
                        }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 hover:border-amber-400 text-left space-y-3 shadow-lg transition active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <Utensils className="w-6 h-6" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">
                            Configurações da Dieta
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Alimentos, receitas, refeições pré-definidas e porções POF/IBGE.
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {mobileNavView === 'treino-cards' && (
                    <div className="space-y-3.5">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('main-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-400" />
                        <span>Voltar à Central de Configuração</span>
                      </button>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkoutSubTab('criar-exercicio');
                            setMobileNavView('criar-exercicio');
                          }}
                          className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 text-left flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                              <Plus className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">
                                Banco de Exercícios • Criar Exercício
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Músculo primário, secundário, equipamento, vídeo até 30s, link ou GIF.
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-emerald-400 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkoutSubTab('editar-exercicio');
                            setMobileNavView('editar-exercicio');
                          }}
                          className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 text-left flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                              <Edit3 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">
                                Editar Exercício do Banco de Exercícios
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Carregar vídeo de até 30 segundos, colocar vídeo com Link ou GIF.
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-cyan-400 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkoutSubTab('metodo-avancado');
                            setMobileNavView('metodo-avancado');
                          }}
                          className="p-4 rounded-2xl bg-slate-950 border border-purple-500/40 text-left flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white">
                                Método Avançado • Criar Método
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Nome do método e opção de habilitar subséries com escritas na Zona de Repetição e Método.
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
                        </button>
                      </div>
                    </div>
                  )}

                  {mobileNavView === 'perfil' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('main-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-400" />
                        <span>Voltar à Central de Configuração</span>
                      </button>
                      {renderProfileSection()}
                    </div>
                  )}

                  {mobileNavView === 'criar-exercicio' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('treino-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-cyan-400" />
                        <span>Voltar para Configurações de Treino</span>
                      </button>
                      {renderCreateExerciseSection()}
                    </div>
                  )}

                  {mobileNavView === 'editar-exercicio' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('treino-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-cyan-400" />
                        <span>Voltar para Configurações de Treino</span>
                      </button>
                      {renderEditExerciseSection()}
                    </div>
                  )}

                  {mobileNavView === 'metodo-avancado' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('treino-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-cyan-400" />
                        <span>Voltar para Configurações de Treino</span>
                      </button>
                      {renderAdvancedMethodSection()}
                    </div>
                  )}

                  {mobileNavView === 'dieta' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileNavView('main-cards')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-amber-400" />
                        <span>Voltar à Central de Configuração</span>
                      </button>
                      <ProfessionalNutritionPanel
                        library={nutritionLibrary}
                        allFoods={allNutritionFoods}
                        onSaveLibrary={handleSaveNutritionLibrary}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SEPARATE WINDOW FOR VIDEO / GIF / MEDIA PREVIEW */}
      <ExerciseMediaModal
        isOpen={!!previewMediaModalEx}
        exercise={previewMediaModalEx}
        onClose={() => setPreviewMediaModalEx(null)}
      />
    </>
  );
};
