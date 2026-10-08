import React, { useRef, useState, useEffect } from 'react';
import type * as mapboxgl from 'mapbox-gl';
import { X } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface AreaDrawOverlayProps {
  map: mapboxgl.Map | null;
  isActive: boolean;
  onAreaDrawn: (polygon: [number, number][]) => void;
  onCancel: () => void;
}

export const AreaDrawOverlay: React.FC<AreaDrawOverlayProps> = ({
  map,
  isActive,
  onAreaDrawn,
  onCancel,
}) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map) return;

    if (isActive) {
      // Disable map navigation so user can draw freely
      map.dragPan.disable();
      map.touchZoomRotate.disable();
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
      setPoints([]);
      setIsDrawing(false);
    } else {
      // Restore map navigation
      map.dragPan.enable();
      map.touchZoomRotate.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      setPoints([]);
      setIsDrawing(false);
    }

    return () => {
      if (map) {
        map.dragPan.enable();
        map.touchZoomRotate.enable();
        map.scrollZoom.enable();
        map.doubleClickZoom.enable();
      }
    };
  }, [isActive, map]);

  if (!isActive) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([{ x, y }]);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(x - last.x, y - last.y) < 4) {
        return prev;
      }
      return [...prev, { x, y }];
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(false);

    if (points.length >= 6 && map) {
      // Convert screen points to geographical coordinates [lng, lat]
      const geoPoints: [number, number][] = points.map((p) => {
        const lngLat = map.unproject([p.x, p.y]);
        return [lngLat.lng, lngLat.lat];
      });

      // Close polygon ring
      if (
        geoPoints.length > 0 &&
        (geoPoints[0][0] !== geoPoints[geoPoints.length - 1][0] ||
          geoPoints[0][1] !== geoPoints[geoPoints.length - 1][1])
      ) {
        geoPoints.push([geoPoints[0][0], geoPoints[0][1]]);
      }

      onAreaDrawn(geoPoints);
    } else {
      setPoints([]);
    }
  };

  const svgPath =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') +
        (isDrawing ? '' : ' Z')
      : '';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute inset-0 z-40 touch-none cursor-crosshair select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Visual Instruction Banner at Top */}
      <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none">
        <div className="bg-slate-900/90 text-white backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl border border-white/20 flex items-center gap-3 animate-fade-in pointer-events-auto">
          <span className="text-sm font-semibold flex items-center gap-2">
            <span className="text-blue-400 font-bold">✏️</span> Обведите область на карте
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Отмена"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas for drawing smooth neon outline */}
      <svg className="w-full h-full pointer-events-none">
        {points.length > 1 && (
          <>
            {/* Outer blur glow */}
            <path
              d={svgPath}
              fill="rgba(59, 130, 246, 0.18)"
              stroke="#3b82f6"
              strokeWidth={8}
              strokeOpacity={0.45}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'blur(3px)' }}
            />
            {/* Crisp neon outline */}
            <path
              d={svgPath}
              fill="rgba(59, 130, 246, 0.22)"
              stroke="#60a5fa"
              strokeWidth={3}
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Start / End anchor dots */}
            <circle cx={points[0].x} cy={points[0].y} r={5} fill="#60a5fa" stroke="#ffffff" strokeWidth={2} />
          </>
        )}
      </svg>
    </div>
  );
};
