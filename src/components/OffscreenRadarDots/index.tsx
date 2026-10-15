import './styles.css';
import React from 'react';
import type { OffscreenDot } from '../../services/vacancyMarkerEngine';
import type { Vacancy } from '../../types';

interface OffscreenRadarDotsProps {
  dots: OffscreenDot[];
  onSelectDot: (vacancy: Vacancy) => void;
}

export const OffscreenRadarDots: React.FC<OffscreenRadarDotsProps> = ({ dots, onSelectDot }) => {
  if (dots.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {dots.map(({ vacancy: vac, edgeX, edgeY }) => (
        <button
          key={`radar-${vac.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectDot(vac);
          }}
          style={{
            transform: `translate3d(${edgeX}px, ${edgeY}px, 0) translate(-50%, -50%)`,
            backgroundColor: vac.color,
            borderColor: vac.accentColor,
          }}
          className="absolute pointer-events-auto p-1 rounded-full border-2 shadow-[0_0_14px_rgba(0,0,0,0.6)] flex items-center justify-center transition-transform hover:scale-125 active:scale-95 group cursor-pointer animate-pulse"
          title={`${vac.title} (${vac.locationName})`}
        >
          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white opacity-90" />
          </div>
        </button>
      ))}
    </div>
  );
};
