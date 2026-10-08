import React from 'react';
import { Plus, Minus, LocateFixed, Pencil } from 'lucide-react';

interface NavigationControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onGeolocate: () => void;
  isDrawMode?: boolean;
  onToggleDrawArea?: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onGeolocate,
  isDrawMode = false,
  onToggleDrawArea,
}) => {
  return (
    <div className="absolute right-5 bottom-24 z-20 flex flex-col pointer-events-auto items-end select-none">
      {/* Zoom, geolocation, lasso */}
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-[0_12px_35px_rgba(24,29,56,0.12)] dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)] border border-slate-200/90 dark:border-slate-700/90 gap-1.5">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#181D38] dark:text-slate-100 font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer"
          title="Приблизить (+)"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={onZoomOut}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#181D38] dark:text-slate-100 font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer"
          title="Отдалить (-)"
        >
          <Minus className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={onGeolocate}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#181D38] dark:text-slate-100 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
          title="Моё местоположение"
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        {/* 4th Button: Lasso / Area selection */}
        <button
          onClick={onToggleDrawArea}
          className={`w-10 h-10 rounded-full transition-all flex items-center justify-center active:scale-95 cursor-pointer ${
            isDrawMode
              ? 'bg-[#181D38] text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-[#181D38] hover:text-white text-[#181D38] dark:text-slate-100'
          }`}
          title={isDrawMode ? 'Отменить выделение области' : 'Обвести область на карте (Лассо)'}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

