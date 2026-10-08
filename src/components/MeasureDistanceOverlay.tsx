import React from 'react';
import { Ruler, Trash2, Check } from 'lucide-react';
import type { MeasurePoint } from '../types';
import { formatDistance } from '../services/mapbox';

interface MeasureDistanceOverlayProps {
  points: MeasurePoint[];
  totalDistance: number;
  onClear: () => void;
  onFinish: () => void;
}

export const MeasureDistanceOverlay: React.FC<MeasureDistanceOverlayProps> = ({
  points,
  totalDistance,
  onClear,
  onFinish,
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-200/90 px-4 py-3 flex items-center gap-4 animate-in fade-in zoom-in-95 pointer-events-auto">
      <div className="flex items-center gap-2 text-amber-700 font-medium text-xs">
        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
          <Ruler className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-800 text-sm block">
            {totalDistance > 0 ? formatDistance(totalDistance) : 'Измерение расстояния'}
          </span>
          <span className="text-[11px] text-slate-500">
            {points.length === 0
              ? 'Кликните на карту для добавления 1-й точки'
              : `Точек: ${points.length}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
        <button
          onClick={onClear}
          disabled={points.length === 0}
          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-xs font-medium transition-colors"
          title="Сбросить точки"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onFinish}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Готово</span>
        </button>
      </div>
    </div>
  );
};
