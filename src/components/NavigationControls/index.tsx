import './styles.css';
import React from 'react';
import { Plus, Minus, LocateFixed, Pencil } from 'lucide-react';
import { Button } from '../Button';

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
        <Button variant="round" className="font-bold" onClick={onZoomIn} title="Приблизить (+)">
          <Plus className="w-4.5 h-4.5" />
        </Button>

        <Button variant="round" className="font-bold" onClick={onZoomOut} title="Отдалить (-)">
          <Minus className="w-4.5 h-4.5" />
        </Button>

        <Button variant="round" onClick={onGeolocate} title="Моё местоположение">
          <LocateFixed className="w-4 h-4" />
        </Button>

        <Button
          variant={isDrawMode ? 'roundActive' : 'round'}
          className={isDrawMode ? undefined : 'btn-round-invert'}
          onClick={onToggleDrawArea}
          title={isDrawMode ? 'Отменить выделение области' : 'Обвести область на карте (Лассо)'}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

