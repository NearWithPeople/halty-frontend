import './styles.css';
import React, { useState } from 'react';
import {
  X, CheckCircle2, Clock,
  MapPin, Send, Share2, Check, Heart, ChevronUp,
  ArrowRight, Trash2,
} from 'lucide-react';
import type { Vacancy } from '../../types';
import { dbStore } from '../../services/dbStore';
import { Button } from '../Button';

interface VacancyModalProps {
  vacancy: Vacancy;
  onClose: () => void;
  onApply?: (vacancy: Vacancy) => void;
  isApplied?: boolean;
  onViewApplication?: (vacancyId: string) => void;
  onOpenCompany?: (companyName: string) => void;
  onDeleted?: (vacancyId: string) => void;
  isStatic?: boolean;
}

export const VacancyModal: React.FC<VacancyModalProps> = ({
  vacancy,
  onClose,
  onApply,
  isApplied = false,
  onViewApplication,
  onOpenCompany,
  onDeleted,
  isStatic = false,
}) => {
  const [isSaved, setIsSaved] = useState(() => dbStore.isFavorite(vacancy.id));
  const [copiedShare, setCopiedShare] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = dbStore.canDeleteVacancy(vacancy);

  const handleApplyClick = () => {
    if (isApplied && onViewApplication) {
      onViewApplication(vacancy.id);
      onClose();
    } else if (onApply) {
      onApply(vacancy);
    }
  };

  const handleToggleFavorite = () => {
    const next = dbStore.toggleFavorite(vacancy.id);
    setIsSaved(next);
  };

  const handleDelete = () => {
    const result = dbStore.deleteOwnVacancy(vacancy.id);
    if (!result.ok) return;
    onDeleted?.(vacancy.id);
    onClose();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `Вакансия "${vacancy.title}" (${vacancy.salary}) — Работодатель: АДМИН (${vacancy.company}), ${vacancy.locationName}`
    );
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={
        isStatic
          ? 'relative w-full max-w-[400px] pointer-events-auto'
          : 'fixed left-4 sm:left-5 bottom-24 z-[70] w-[calc(100vw-2rem)] sm:w-[380px] max-w-[400px] pointer-events-auto'
      }
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-[28px] shadow-[0_20px_60px_-10px_rgba(15,23,42,0.3)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55)] border border-slate-200/90 dark:border-slate-700/90 overflow-hidden relative pointer-events-auto${isStatic ? '' : ' vac-modal-in'}`}
      >
        {/* Color accent top bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: vacancy.color }} />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase text-white shadow-xs"
                style={{ backgroundColor: vacancy.color }}
              >
                {vacancy.categoryLabel}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 cursor-pointer pointer-events-auto ${
                  isSaved ? 'bg-rose-50 text-rose-500 border border-rose-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={isSaved ? 'Удалить из избранного' : 'В избранное'}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500' : ''}`} />
              </button>
              <Button
                variant="chip"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Title & Employer (АДМИН) */}
          <div className="mb-3">
            <h2 className="text-base font-black text-slate-900 leading-snug">
              {vacancy.title}
            </h2>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Работодатель:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenCompany) onOpenCompany(vacancy.company);
                }}
                className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1 cursor-pointer transition-colors group"
                title="Подробнее о компании"
              >
                <span>{vacancy.company}</span>
                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
              </button>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-black text-[10px] tracking-wide uppercase border border-purple-200 shadow-2xs">
                АДМИН
              </span>
            </div>
          </div>

          {/* Salary card */}
          <div
            className="p-3 rounded-2xl mb-3 flex items-center justify-between border"
            style={{
              background: vacancy.color + '10',
              borderColor: vacancy.color + '30',
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {vacancy.payoutType}
              </span>
              <span className="text-base font-black text-slate-900">{vacancy.salary}</span>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs"
              style={{ backgroundColor: vacancy.color }}
            >
              BYN
            </div>
          </div>

          {/* Key details */}
          <div className="space-y-1.5 mb-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{vacancy.address ? `г. Минск, ${vacancy.address}` : vacancy.locationName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{vacancy.schedule}</span>
            </div>
          </div>

          {/* Collapsible description */}
          <div className="border-t border-slate-100 pt-2 mb-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-700 py-1 cursor-pointer pointer-events-auto"
            >
              <span>{expanded ? 'Скрыть подробности' : 'Подробнее о вакансии'}</span>
              <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`} />
            </button>
            {expanded && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                {vacancy.description}
              </p>
            )}
          </div>

          {/* Requirements */}
          {vacancy.requirements && vacancy.requirements.length > 0 && expanded && (
            <div className="mb-3">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Требования:
              </span>
              <div className="space-y-1">
                {vacancy.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canDelete && confirmDelete && (
            <div className="mb-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 space-y-2">
              <p className="text-xs font-bold text-red-900 dark:text-red-200">
                Снять смену с карты? Отклики по этой вакансии будут удалены.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs font-bold cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            {canDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer pointer-events-auto shadow-md active:scale-98 border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить мою смену</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyClick();
                }}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer pointer-events-auto shadow-md active:scale-98 relative z-10 ${
                  isApplied
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'text-white hover:brightness-105'
                }`}
                style={isApplied ? {} : { backgroundColor: vacancy.color }}
              >
                {isApplied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Статус заявки</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Откликнуться</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer pointer-events-auto relative z-10"
              title="Поделиться"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
