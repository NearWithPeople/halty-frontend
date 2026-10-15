import './styles.css';
import React, { useState, useEffect } from 'react';
import {
  Car,
  Footprints,
  Bike,
  ArrowUpDown,
  X,
  Navigation,
  Clock,
  Milestone,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { Coordinates, RouteInfo, TravelProfile } from '../../types';
import { fetchDirections, formatDistance, formatDuration } from '../../services/mapbox';

interface DirectionsPanelProps {
  token: string;
  origin: { name: string; coords: Coordinates } | null;
  destination: { name: string; coords: Coordinates } | null;
  onSetOrigin: (val: { name: string; coords: Coordinates } | null) => void;
  onSetDestination: (val: { name: string; coords: Coordinates } | null) => void;
  onRouteFound: (route: RouteInfo | null) => void;
  onClose: () => void;
  onSelectCurrentLocationAsOrigin: () => void;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  token,
  origin,
  destination,
  onSetOrigin,
  onSetDestination,
  onRouteFound,
  onClose,
  onSelectCurrentLocationAsOrigin,
}) => {
  const [profile, setProfile] = useState<TravelProfile>('driving');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto calculate route when origin and destination are set
  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      onRouteFound(null);
      return;
    }

    let isMounted = true;
    async function calculate() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchDirections(origin!.coords, destination!.coords, profile, token);
        if (!isMounted) return;
        if (res) {
          setRoute(res);
          onRouteFound(res);
        } else {
          setErrorMsg('Не удалось построить маршрут между указанными точками');
          setRoute(null);
          onRouteFound(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg('Ошибка расчета маршрута');
        setRoute(null);
        onRouteFound(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    calculate();
    return () => {
      isMounted = false;
    };
  }, [origin, destination, profile, token]);

  const handleSwap = () => {
    const temp = origin;
    onSetOrigin(destination);
    onSetDestination(temp);
  };

  return (
    <div className="absolute top-4 left-4 z-30 w-full max-w-[420px] sm:max-w-[460px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Navigation className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Построение маршрута</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Travel mode selector */}
      <div className="flex gap-2 my-3 p-1 bg-slate-100/80 rounded-xl">
        <button
          onClick={() => setProfile('driving')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            profile === 'driving'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Авто</span>
        </button>
        <button
          onClick={() => setProfile('walking')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            profile === 'walking'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Пешком</span>
        </button>
        <button
          onClick={() => setProfile('cycling')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            profile === 'cycling'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Велосипед</span>
        </button>
      </div>

      {/* Inputs for Origin & Destination */}
      <div className="relative flex flex-col gap-2.5">
        {/* Origin */}
        <div className="flex items-center gap-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/70">
          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 ml-1"></div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Откуда</span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {origin ? origin.name : 'Кликните на карту или выберите точку'}
            </span>
          </div>
          {!origin && (
            <button
              onClick={onSelectCurrentLocationAsOrigin}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md shrink-0"
            >
              Моё место
            </button>
          )}
          {origin && (
            <button
              onClick={() => onSetOrigin(null)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-md border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
          title="Поменять местами"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>

        {/* Destination */}
        <div className="flex items-center gap-2 bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/70">
          <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100 shrink-0 ml-1"></div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Куда</span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {destination ? destination.name : 'Кликните на карту или выберите точку'}
            </span>
          </div>
          {destination && (
            <button
              onClick={() => onSetDestination(null)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Строим оптимальный маршрут...</span>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Route results */}
      {route && !loading && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-base">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{formatDuration(route.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Milestone className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDistance(route.distance)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>По шагам</span>
              {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Turn by turn steps accordion */}
          {showSteps && route.steps && route.steps.length > 0 && (
            <div className="mt-2.5 max-h-[220px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-slate-50/50 p-2">
              {route.steps.map((step, idx) => (
                <div key={idx} className="py-2 px-1 flex items-start gap-2.5 text-xs">
                  <div className="p-1 rounded-full bg-blue-100 text-blue-600 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium">{step.instruction}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDistance(step.distance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
