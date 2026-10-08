import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Compass,
  Navigation,
  Bookmark,
  Key,
  Coffee,
  Utensils,
  Fuel,
  Building2,
  Trees,
  Landmark,
  Loader2,
} from 'lucide-react';
import type { SearchResult } from '../types';
import { searchPlaces } from '../services/mapbox';

interface SearchBarProps {
  token: string;
  currentCoords: [number, number];
  onSelectResult: (result: SearchResult) => void;
  onOpenDirections: () => void;
  onOpenSaved: () => void;
  onOpenTokenModal: () => void;
  isDirectionsOpen: boolean;
}

const CATEGORIES = [
  { label: 'Кафе', query: 'кафе', icon: Coffee },
  { label: 'Рестораны', query: 'ресторан', icon: Utensils },
  { label: 'Заправки', query: 'заправка', icon: Fuel },
  { label: 'Отели', query: 'отель', icon: Building2 },
  { label: 'Достопримечательности', query: 'музей памятник', icon: Landmark },
  { label: 'Парки', query: 'парк сквер', icon: Trees },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  token,
  currentCoords,
  onSelectResult,
  onOpenDirections,
  onOpenSaved,
  onOpenTokenModal,
  isDirectionsOpen,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found = await searchPlaces(query, token, currentCoords);
        setResults(found);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, token, currentCoords]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    setQuery(item.text);
    setIsOpen(false);
    onSelectResult(item);
  };

  const handleCategoryClick = (categoryQuery: string) => {
    setQuery(categoryQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-4 z-20 w-full max-w-[420px] sm:max-w-[460px] pointer-events-auto"
    >
      {/* Main search box */}
      <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 mr-2 shrink-0">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Поиск адреса, города или места..."
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
        />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin mr-2 shrink-0" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 mr-1.5 transition-colors"
            title="Очистить"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}

        <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>

        <button
          onClick={onOpenDirections}
          className={`p-2 rounded-xl transition-colors ml-1 ${
            isDirectionsOpen
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
          }`}
          title="Маршруты"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSaved}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
          title="Сохраненные места"
        >
          <Bookmark className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTokenModal}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
          title="Настройка Mapbox Token"
        >
          <Key className="w-4 h-4" />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden max-h-[380px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Результаты поиска ({results.length})
          </div>
          <ul className="divide-y divide-slate-100/80">
            {results.map((item, index) => {
              const isSelected = index === selectedIndex;
              const placeType = item.place_type?.[0] || 'place';

              return (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {placeType === 'poi' ? (
                      <Compass className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.text}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.place_name}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Quick Category Chips */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.label}
              onClick={() => handleCategoryClick(cat.query)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white backdrop-blur-md rounded-full shadow-md hover:shadow-lg border border-slate-200/80 text-xs font-medium text-slate-700 whitespace-nowrap transition-all transform active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-slate-500" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
