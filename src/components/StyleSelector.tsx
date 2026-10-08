import React from 'react';
import { Check, X, Layers, Sun, Moon, Compass, Mountain, Globe } from 'lucide-react';
import type { MapStyleOption } from '../types';
import { MAP_STYLES } from '../services/mapbox';

interface StyleSelectorProps {
  currentStyleId: string;
  onSelectStyle: (style: MapStyleOption) => void;
  onClose: () => void;
  token?: string;
  isStatic?: boolean;
}

const STYLE_ICONS: Record<string, React.ReactNode> = {
  streets: <Compass className="w-4 h-4 text-blue-500" />,
  'satellite-streets': <Globe className="w-4 h-4 text-emerald-500" />,
  outdoors: <Mountain className="w-4 h-4 text-amber-600" />,
  dark: <Moon className="w-4 h-4 text-purple-400" />,
  light: <Sun className="w-4 h-4 text-amber-500" />,
  'navigation-day': <Compass className="w-4 h-4 text-cyan-600" />,
  'navigation-night': <Moon className="w-4 h-4 text-indigo-400" />,
};

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  currentStyleId,
  onSelectStyle,
  onClose,
  isStatic = false,
}) => {
  return (
    <div
      className={
        isStatic
          ? 'relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-4 pointer-events-auto'
          : 'absolute right-4 bottom-24 z-30 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto'
      }
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Тип карты и слои</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {MAP_STYLES.map((style) => {
          const isActive = style.id === currentStyleId;
          const icon = STYLE_ICONS[style.id] || <Layers className="w-4 h-4" />;

          return (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style)}
              className={`group text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between relative ${
                isActive
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                  <Check className="w-3 h-3" />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1.5">
                {icon}
                <span className="font-bold text-slate-800 truncate">{style.name}</span>
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {style.description}
              </p>

              {style.badge && (
                <span className="mt-2 inline-block self-start px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-700">
                  {style.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
