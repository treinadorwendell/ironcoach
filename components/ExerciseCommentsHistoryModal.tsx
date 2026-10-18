'use client';

import React, { useSyncExternalStore } from 'react';
import { storage } from '@/lib/storage';
import { MessageSquare, Calendar, X, FileText } from 'lucide-react';

interface ExerciseCommentsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  clientId: string;
}

export const ExerciseCommentsHistoryModal: React.FC<ExerciseCommentsHistoryModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  clientId,
}) => {
  const storeKey = useSyncExternalStore(
    (callback) => {
      window.addEventListener('ironcoach:data-synced', callback);
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener('ironcoach:data-synced', callback);
        window.removeEventListener('storage', callback);
      };
    },
    () => {
      if (typeof window === 'undefined') return '';
      return localStorage.getItem('ironcoach_exercise_comments_v1') || '';
    },
    () => ''
  );

  if (!isOpen) return null;

  const comments = storage.getExerciseComments(exerciseName, clientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col sm:rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Histórico de Comentários
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30 shrink-0">
                  {exerciseName}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Comentários e anotações registradas em sessões anteriores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {comments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 space-y-3 my-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Nenhum comentário anterior</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Ainda não há anotações ou comentários salvos para este exercício neste perfil.
                </p>
              </div>
            </div>
          ) : (
            comments.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5 font-bold text-purple-300 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {record.date}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(record.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {record.comment}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Total: {comments.length} {comments.length === 1 ? 'comentário' : 'comentários'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
