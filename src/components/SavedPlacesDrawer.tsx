import React, { useState } from 'react';
import { Bookmark, X, Trash2, MapPin, Search } from 'lucide-react';
import type { SavedPlace } from '../types';

interface SavedPlacesDrawerProps {
  savedPlaces: SavedPlace[];
  onSelectPlace: (place: SavedPlace) => void;
  onRemovePlace: (id: string) => void;
  onClose: () => void;
}

export const SavedPlacesDrawer: React.FC<SavedPlacesDrawerProps> = ({
  savedPlaces,
  onSelectPlace,
  onRemovePlace,
  onClose,
}) => {
  const [filter, setFilter] = useState('');

  const filteredPlaces = savedPlaces.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.address.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-full max-w-sm bg-white shadow-2xl border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-200 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <Bookmark className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Сохраненные места</h2>
            <p className="text-xs text-slate-500">Всего: {savedPlaces.length}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter search */}
      {savedPlaces.length > 0 && (
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Поиск по закладкам..."
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
        {filteredPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-400">
            <Bookmark className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {savedPlaces.length === 0 ? 'Нет сохраненных мест' : 'Ничего не найдено'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {savedPlaces.length === 0
                ? 'Кликните на любое место или найдите его через поиск, чтобы добавить в избранное'
                : 'Попробуйте изменить поисковый запрос'}
            </p>
          </div>
        ) : (
          filteredPlaces.map((place) => (
            <div
              key={place.id}
              className="p-3 hover:bg-slate-50 rounded-xl transition-colors flex items-start justify-between gap-2 group cursor-pointer"
              onClick={() => onSelectPlace(place)}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{place.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{place.address}</p>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                    {place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlace(place.id);
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Удалить из закладок"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
