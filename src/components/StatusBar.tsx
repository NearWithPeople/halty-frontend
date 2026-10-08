import React from 'react';
import { Compass, ZoomIn } from 'lucide-react';
import type { Coordinates } from '../types';

interface StatusBarProps {
  coordinates: Coordinates;
  zoom: number;
  styleName: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ coordinates, zoom, styleName }) => {
  return (
    <div className="absolute bottom-2 left-4 z-10 hidden sm:flex items-center gap-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200/80 shadow-sm text-[11px] text-slate-600 pointer-events-auto select-none">
      <div className="flex items-center gap-1 font-mono">
        <Compass className="w-3 h-3 text-slate-400" />
        <span>
          {coordinates.lat.toFixed(5)}°N, {coordinates.lng.toFixed(5)}°E
        </span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200"></div>

      <div className="flex items-center gap-1 font-medium">
        <ZoomIn className="w-3 h-3 text-slate-400" />
        <span>Масштаб: {zoom.toFixed(1)}</span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200"></div>

      <span className="font-semibold text-slate-700">{styleName}</span>
    </div>
  );
};
