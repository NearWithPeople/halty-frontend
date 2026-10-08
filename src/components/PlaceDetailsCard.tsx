import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Bookmark,
  Share2,
  Copy,
  Check,
  X,
} from 'lucide-react';
import type { PlaceInfo } from '../types';

interface PlaceDetailsCardProps {
  place: PlaceInfo;
  onClose: () => void;
  onRouteTo: (place: PlaceInfo) => void;
  onSavePlace: (place: PlaceInfo) => void;
  isSaved: boolean;
  isStatic?: boolean;
}

export const PlaceDetailsCard: React.FC<PlaceDetailsCardProps> = ({
  place,
  onClose,
  onRouteTo,
  onSavePlace,
  isSaved,
  isStatic = false,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const coordsText = `${place.coordinates.lat.toFixed(6)}, ${place.coordinates.lng.toFixed(6)}`;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(coordsText);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?lat=${place.coordinates.lat}&lng=${place.coordinates.lng}&z=14`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div
      className={
        isStatic
          ? 'relative w-full max-w-[380px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-4 pointer-events-auto'
          : 'absolute bottom-24 left-5 z-20 w-full max-w-[340px] sm:max-w-[380px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto'
      }
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500 text-white shrink-0 mt-0.5 shadow-sm">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate leading-snug">
              {place.name}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
              {place.place_name}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinates pill */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 my-3 text-xs">
        <span className="font-mono text-slate-600 text-[11px]">{coordsText}</span>
        <button
          onClick={handleCopyCoords}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {copiedCoords ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => onRouteTo(place)}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-xs font-semibold transition-all transform active:scale-95"
        >
          <Navigation className="w-4 h-4" />
          <span>Маршрут</span>
        </button>

        <button
          onClick={() => onSavePlace(place)}
          className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all transform active:scale-95 ${
            isSaved
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
          <span>{isSaved ? 'Сохранено' : 'В закладки'}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all transform active:scale-95"
        >
          {copiedShare ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600">Скопировано</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Поделиться</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
