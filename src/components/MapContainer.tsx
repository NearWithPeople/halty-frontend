import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature, Polygon } from 'geojson';
import type { Coordinates, PlaceInfo, Vacancy } from '../types';
import { VacancyMarkerEngine } from '../services/vacancyMarkerEngine';
import { applyMapStyleCustomizations, invalidateMapStyleCustomizations } from '../services/mapbox';

const MARKER_CLICK_GUARD_MS = 600;

function markMarkerClick(): void {
  (window as any).__lastMarkerClickTime = Date.now();
}

function isRecentMarkerClick(): boolean {
  const last = (window as any).__lastMarkerClickTime as number | undefined;
  return typeof last === 'number' && Date.now() - last < MARKER_CLICK_GUARD_MS;
}

interface MapContainerProps {
  token: string;
  styleUrl: string;
  is3DBuildings: boolean;
  selectedPlace: PlaceInfo | null;
  selectedVacancy: Vacancy | null;
  vacancies: Vacancy[];
  userCoords: Coordinates | null;
  drawnPolygon?: [number, number][] | null;
  isDrawMode?: boolean;
  onSelectVacancy: (vacancy: Vacancy) => void;
  onDeselectVacancy?: () => void;
  onMapClick: (coords: Coordinates) => void;
  onViewportChange: (viewport: {
    center: Coordinates;
    zoom: number;
    bearing: number;
    pitch: number;
    bounds?: { north: number; south: number; east: number; west: number };
  }) => void;
  onMapLoaded: (map: mapboxgl.Map) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  token,
  styleUrl,
  is3DBuildings = true,
  selectedPlace,
  selectedVacancy,
  vacancies,
  userCoords,
  drawnPolygon,
  isDrawMode = false,
  onSelectVacancy,
  onDeselectVacancy,
  onMapClick,
  onViewportChange,
  onMapLoaded,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerEngineRef = useRef<VacancyMarkerEngine | null>(null);
  // Orbit camera refs for 3D inspection
  const prevCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);
  const rotationRafRef = useRef<number | null>(null);
  const isOrbitingRef = useRef(false);
  const selectedVacancyRef = useRef<Vacancy | null>(selectedVacancy);
  const isDrawModeRef = useRef(isDrawMode);
  const isometricResetTimerRef = useRef<number | null>(null);
  const mapMovingRef = useRef(false);
  const lastFootprintZoomRef = useRef<number | null>(null);
  const isInitialStyleRef = useRef(true);

  // Standard isometric orientation defaults
  const ISOMETRIC_PITCH = 52;
  const ISOMETRIC_BEARING = -15;

  useEffect(() => {
    selectedVacancyRef.current = selectedVacancy;
  }, [selectedVacancy]);

  useEffect(() => {
    isDrawModeRef.current = isDrawMode;
    const map = mapRef.current;
    if (!map) return;

    if (isDrawMode) {
      if (isometricResetTimerRef.current !== null) {
        window.clearTimeout(isometricResetTimerRef.current);
        isometricResetTimerRef.current = null;
      }
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 650,
      });
    } else if (!selectedVacancyRef.current) {
      map.easeTo({
        pitch: ISOMETRIC_PITCH,
        bearing: ISOMETRIC_BEARING,
        duration: 800,
      });
    }
  }, [isDrawMode]);

  const stopOrbit = () => {
    isOrbitingRef.current = false;
    if (rotationRafRef.current !== null) {
      cancelAnimationFrame(rotationRafRef.current);
      rotationRafRef.current = null;
    }
  };

  const startOrbit = () => {
    stopOrbit();
    isOrbitingRef.current = true;
    let frame = 0;

    const step = () => {
      if (!isOrbitingRef.current || !mapRef.current) return;
      frame += 1;
      if (frame % 2 === 0) {
        const currentBearing = mapRef.current.getBearing();
        mapRef.current.setBearing((currentBearing + 0.32) % 360);
      }
      rotationRafRef.current = requestAnimationFrame(step);
    };

    rotationRafRef.current = requestAnimationFrame(step);
  };

  // Markers refs
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userCoordsPropRef = useRef(userCoords);
  userCoordsPropRef.current = userCoords;

  // Callbacks ref
  const callbacksRef = useRef({
    onMapClick,
    onSelectVacancy,
    onDeselectVacancy,
    onViewportChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMapClick,
      onSelectVacancy,
      onDeselectVacancy,
      onViewportChange,
    };
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    // Center in central Minsk with 3D pitch
    const initialCenter: [number, number] = [27.5615, 53.9045];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: initialCenter,
      zoom: 14.2,
      pitch: 52, // 3D perspective by default
      bearing: -15,
      antialias: false,
      fadeDuration: 0,
      renderWorldCopies: false,
      maxTileCacheSize: 100,
      attributionControl: true,
    });

    mapRef.current = map;

    // Add scale control
    const scale = new mapboxgl.ScaleControl({
      maxWidth: 120,
      unit: 'metric',
    });
    map.addControl(scale, 'bottom-left');

    map.on('load', () => {
      onMapLoaded(map);
      placeUserMarker(map, userCoordsPropRef.current);

      // 1. Hidden building layer for footprint queries (no global 3D cityscape)
      updateDefault3DBuildings(map, is3DBuildings);

      // 2. Setup Vacancy 3D colored buildings and ground surface zones
      renderVacancyColoredLayers(map, vacancies, selectedVacancy);

      // 3. Setup Vacancy Marker Engine (native Mapbox markers with zero-latency drag)
      const markerEngine = new VacancyMarkerEngine(
        map,
        (vac) => {
          markMarkerClick();
          selectedVacancyRef.current = vac;
          callbacksRef.current.onSelectVacancy(vac);
        }
      );
      markerEngineRef.current = markerEngine;
      markerEngine.setVacancies(vacancies, selectedVacancy?.id || null);

      // 4. Render initial drawn polygon if active
      renderDrawnAreaPolygon(map, drawnPolygon);

      // 5. Russian labels + minimal map (streets, bus/metro, vacancy pins only)
      applyMapStyleCustomizations(map);
    });

    const emitViewportChange = () => {
      const center = map.getCenter();
      const b = map.getBounds();
      callbacksRef.current.onViewportChange({
        center: { lng: center.lng, lat: center.lat },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        bounds: b ? {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        } : undefined,
      });
    };

    const handleMoveStart = () => {
      mapMovingRef.current = true;
    };

    const handleMoveEnd = () => {
      mapMovingRef.current = false;
      emitViewportChange();
    };

    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);
    map.on('load', emitViewportChange);

    // Refresh building footprints only when zoom changes enough (skip label re-processing)
    let footprintRefreshTimer: number | null = null;
    const handleRefreshFootprints = () => {
      if (footprintRefreshTimer !== null) return;
      footprintRefreshTimer = window.setTimeout(() => {
        footprintRefreshTimer = null;
        if (!mapRef.current || mapMovingRef.current) return;

        const zoom = mapRef.current.getZoom();
        if (zoom < 14) return;

        const prevZoom = lastFootprintZoomRef.current;
        if (prevZoom !== null && Math.abs(prevZoom - zoom) < 0.35) return;

        lastFootprintZoomRef.current = zoom;
        renderVacancyColoredLayers(map, vacancies, selectedVacancyRef.current);
      }, 500);
    };
    map.on('idle', handleRefreshFootprints);

    // Auto-return to isometric view whenever user finishes interacting
    const scheduleIsometricReturn = () => {
      if (isometricResetTimerRef.current !== null) {
        window.clearTimeout(isometricResetTimerRef.current);
        isometricResetTimerRef.current = null;
      }

      // Do not return to isometric if in lasso draw mode, orbiting, or inspecting a selected vacancy
      if (isDrawModeRef.current || isOrbitingRef.current || selectedVacancyRef.current) {
        return;
      }

      isometricResetTimerRef.current = window.setTimeout(() => {
        if (!mapRef.current || isDrawModeRef.current || isOrbitingRef.current || selectedVacancyRef.current) {
          return;
        }

        const curPitch = mapRef.current.getPitch();
        const curBearing = mapRef.current.getBearing();

        // Check if map deviates from default isometric angle
        const pitchDiff = Math.abs(curPitch - ISOMETRIC_PITCH);
        const bearingDiff = Math.abs(curBearing - ISOMETRIC_BEARING);

        if (pitchDiff > 1.0 || bearingDiff > 1.0) {
          mapRef.current.easeTo({
            pitch: ISOMETRIC_PITCH,
            bearing: ISOMETRIC_BEARING,
            duration: 650,
          });
        }
      }, 600);
    };

    map.on('moveend', scheduleIsometricReturn);
    map.on('dragend', scheduleIsometricReturn);
    map.on('rotateend', scheduleIsometricReturn);
    map.on('pitchend', scheduleIsometricReturn);

    // Stop orbit on interaction; do NOT deselect — wheel/drag was clearing the modal instantly after pin click.
    const handleUserMapInteraction = () => {
      if (isometricResetTimerRef.current !== null) {
        window.clearTimeout(isometricResetTimerRef.current);
        isometricResetTimerRef.current = null;
      }
      stopOrbit();
    };

    map.on('dragstart', handleUserMapInteraction);
    map.on('rotatestart', handleUserMapInteraction);
    map.on('pitchstart', handleUserMapInteraction);
    map.on('wheel', handleUserMapInteraction);

    map.on('click', (e) => {
      if (isRecentMarkerClick()) return;
      const clickedCoords: Coordinates = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      callbacksRef.current.onMapClick(clickedCoords);
    });

    return () => {
      if (isometricResetTimerRef.current !== null) {
        window.clearTimeout(isometricResetTimerRef.current);
        isometricResetTimerRef.current = null;
      }
      stopOrbit();
      if (markerEngineRef.current) {
        markerEngineRef.current.destroy();
      }
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Handle style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isInitialStyleRef.current) {
      isInitialStyleRef.current = false;
      return;
    }

    invalidateMapStyleCustomizations(map);
    lastFootprintZoomRef.current = null;
    map.setStyle(styleUrl);

    map.once('style.load', () => {
      updateDefault3DBuildings(map, is3DBuildings);
      renderVacancyColoredLayers(map, vacancies, selectedVacancy, markerEngineRef.current);
      renderDrawnAreaPolygon(map, drawnPolygon);
      applyMapStyleCustomizations(map);
    });
  }, [styleUrl]);

  // Sync drawn area polygon filter
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      renderDrawnAreaPolygon(map, drawnPolygon);
    }
  }, [drawnPolygon]);

  // 3D buildings toggle
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      updateDefault3DBuildings(map, is3DBuildings);
    }
  }, [is3DBuildings]);

  // Sync vacancies with marker engine and 3D layers
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      renderVacancyColoredLayers(map, vacancies, selectedVacancy, markerEngineRef.current);
    }
    if (markerEngineRef.current) {
      markerEngineRef.current.setVacancies(vacancies, selectedVacancy?.id || null);
    }
  }, [selectedVacancy, vacancies]);

  // Cinematic 3D camera zoom-in, slow rotation around bubble, and restoration on exit
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedVacancy) {
      // 1. Save previous camera state before zooming in
      if (!prevCameraRef.current) {
        const center = map.getCenter();
        prevCameraRef.current = {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };
      }

      stopOrbit();

      // 2. Fly camera in to 3D perspective directly on the vacancy bubble
      map.flyTo({
        center: [selectedVacancy.coordinates.lng, selectedVacancy.coordinates.lat],
        zoom: 17.4,
        pitch: 62,
        duration: 1200,
        essential: true,
      });

      // 3. When fly-in completes, begin slow 3D orbit around the bubble and ensure full 3D building extrusion
      const onMoveEnd = () => {
        if (selectedVacancyRef.current?.id === selectedVacancy.id) {
          // Re-render building at zoom 17.4 to query exact vector building footprint and extrude in full 3D!
          renderVacancyColoredLayers(map, vacancies, selectedVacancy, markerEngineRef.current);
          startOrbit();
        }
      };

      map.once('moveend', onMoveEnd);

      const onIdle = () => {
        if (selectedVacancyRef.current?.id === selectedVacancy.id) {
          renderVacancyColoredLayers(map, vacancies, selectedVacancy, markerEngineRef.current);
        }
      };
      map.once('idle', onIdle);
    } else {
      // Exiting the bubble (drawer closed): stop rotation and restore previous camera scale
      stopOrbit();

      if (prevCameraRef.current) {
        const prev = prevCameraRef.current;
        prevCameraRef.current = null;

        map.flyTo({
          center: prev.center,
          zoom: prev.zoom,
          pitch: prev.pitch,
          bearing: prev.bearing,
          duration: 1100,
          essential: true,
        });
      }
    }
  }, [selectedVacancy]);

  // Selected place marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (selectedPlace) {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white transform transition-transform group-hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2 h-1 bg-black/30 rounded-full blur-[1px]"></div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([selectedPlace.coordinates.lng, selectedPlace.coordinates.lat])
        .addTo(map);

      selectedMarkerRef.current = marker;
    }
  }, [selectedPlace]);

  const placeUserMarker = (map: mapboxgl.Map, coords: Coordinates | null) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (!coords) return;

    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.width = '18px';
    el.style.height = '18px';
    el.innerHTML = `
      <span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(37,99,235,0.28);"></span>
      <span style="position:absolute;inset:0;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></span>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
  };

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    placeUserMarker(map, userCoords);
  }, [userCoords]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

/**
 * 1. Default Mapbox 3D buildings layer with soft lighting
 */
const mapLightConfigured = new WeakSet<mapboxgl.Map>();

function updateDefault3DBuildings(map: mapboxgl.Map, show: boolean) {
  const buildingLayerId = '3d-buildings';

  if (!map.isStyleLoaded()) return;

  // Clear legacy shadow layers (removed for performance)
  ['3d-buildings-shadow', '3d-buildings-shadow-1', '3d-buildings-shadow-2', '3d-buildings-shadow-3', '3d-buildings-shadow-4'].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });

  if (!mapLightConfigured.has(map)) {
    map.setLight({
      anchor: 'viewport',
      color: '#f8fafc',
      intensity: 0.35,
      position: [1.5, 210, 32],
    });
    mapLightConfigured.add(map);
  }

  if (map.getLayer(buildingLayerId)) {
    map.setLayoutProperty(buildingLayerId, 'visibility', show ? 'visible' : 'none');
    return;
  }

  const layers = map.getStyle()?.layers;
  if (!layers) return;

  const labelLayerId = layers.find(
    (layer) => layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']
  )?.id;

  // 3D Buildings with crisp, realistic architectural shading
  if (!map.getLayer(buildingLayerId)) {
    map.addLayer(
      {
        id: buildingLayerId,
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'height'],
            0, '#f8fafc',
            25, '#e2e8f0',
            65, '#cbd5e1'
          ],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.78,
        },
      },
      labelLayerId
    );
    if (!show) {
      map.setLayoutProperty(buildingLayerId, 'visibility', 'none');
    }
  }
}

/**
 * 2. Vacancy Ground Spotlight Aura (Ambient Halo) & Clean Architectural Foundation Outline
 * Eliminates ugly z-fighting, flickering vector tiles, and glitchy 3D cube colorizations.
 */
interface BuildingPolygonResult {
  coordinates: [number, number][][];
  height: number;
  centroid: [number, number];
}

const buildingPolygonCache = new Map<string, BuildingPolygonResult>();

function createDefaultBuildingBox(lng: number, lat: number, widthMeters = 26, heightMeters = 20): [number, number][][] {
  const dLat = (heightMeters / 2) / 111320;
  const dLng = (widthMeters / 2) / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ]];
}

function renderVacancyColoredLayers(
  map: mapboxgl.Map,
  vacancies: Vacancy[],
  selectedVacancy: Vacancy | null,
  _markerEngine?: VacancyMarkerEngine | null
) {
  const zoom = map.getZoom();
  const canQueryBuildings = zoom >= 14.5;

  // 1. Footprint Foundation Outline - rendered IMMEDIATELY for every building vacancy!
  const footprintFeatures: Feature<Polygon>[] = [];

  for (const v of vacancies) {
    if (v.attachmentType !== 'building') continue;

    const cachedBuilding = buildingPolygonCache.get(v.id);
    const realBuilding =
      cachedBuilding ||
      (canQueryBuildings
        ? getRealBuildingPolygon(map, v.coordinates.lng, v.coordinates.lat, v.id)
        : null);
    const coords = realBuilding ? realBuilding.coordinates : createDefaultBuildingBox(v.coordinates.lng, v.coordinates.lat);

    const isSelected = selectedVacancy?.id === v.id;

    footprintFeatures.push({
      type: 'Feature',
      properties: {
        id: v.id,
        color: v.color,
        accentColor: v.accentColor,
        isSelected,
      },
      geometry: {
        type: 'Polygon',
        coordinates: coords,
      },
    });
  }

  const footprintSourceId = 'vacancy-footprint-source';
  const footprintFillId = 'vacancy-footprint-fill-layer';
  const footprintGlowId = 'vacancy-footprint-glow-layer';
  const footprintLineId = 'vacancy-footprint-line-layer';

  if (map.getSource(footprintSourceId)) {
    (map.getSource(footprintSourceId) as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: footprintFeatures,
    });
  } else {
    map.addSource(footprintSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: footprintFeatures,
      },
    });
  }

  // Architectural interior floor fill (matches circle halo fill)
  if (!map.getLayer(footprintFillId) && map.getSource(footprintSourceId)) {
    map.addLayer({
      id: footprintFillId,
      type: 'fill',
      source: footprintSourceId,
      minzoom: 11.5,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['case', ['get', 'isSelected'], 0.35, 0.16],
      },
    });
  }

  // Soft ambient ground glow around building foundation
  if (!map.getLayer(footprintGlowId) && map.getSource(footprintSourceId)) {
    map.addLayer({
      id: footprintGlowId,
      type: 'line',
      source: footprintSourceId,
      minzoom: 11.5,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['get', 'isSelected'], 8, 4],
        'line-blur': ['case', ['get', 'isSelected'], 6, 3],
        'line-opacity': ['case', ['get', 'isSelected'], 0.55, 0.30],
      },
    });
  }

  // Crisp neon dashed boundary contour (matches circle halo border style)
  if (!map.getLayer(footprintLineId) && map.getSource(footprintSourceId)) {
    map.addLayer({
      id: footprintLineId,
      type: 'line',
      source: footprintSourceId,
      minzoom: 11.5,
      paint: {
        'line-color': ['get', 'accentColor'],
        'line-width': ['case', ['get', 'isSelected'], 2.5, 1.8],
        'line-dasharray': [2, 2],
        'line-opacity': ['case', ['get', 'isSelected'], 0.90, 0.65],
      },
    });
  }

  // 2. Ambient Ground Halo Spotlight ONLY for parks and ground zones (buildings use their footprint outline!)
  const haloFeatures: Feature<Polygon>[] = vacancies
    .filter((v) => v.attachmentType === 'ground_zone')
    .map((v) => {
      const isSelected = selectedVacancy?.id === v.id;
      const radius = v.zoneRadius || 50;
      return {
        type: 'Feature',
        properties: {
          id: v.id,
          color: v.color,
          accentColor: v.accentColor,
          isSelected,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [createCirclePolygon(v.coordinates.lng, v.coordinates.lat, radius)],
        },
      };
    });

  const haloSourceId = 'vacancy-halo-source';
  const haloFillLayerId = 'vacancy-halo-fill-layer';
  const haloLineLayerId = 'vacancy-halo-line-layer';

  if (map.getSource(haloSourceId)) {
    (map.getSource(haloSourceId) as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: haloFeatures,
    });
  } else {
    map.addSource(haloSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: haloFeatures,
      },
    });
  }

  if (!map.getLayer(haloFillLayerId) && map.getSource(haloSourceId)) {
    map.addLayer({
      id: haloFillLayerId,
      type: 'fill',
      source: haloSourceId,
      minzoom: 13.5,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['case', ['get', 'isSelected'], 0.35, 0.16],
      },
    });
  }

  if (!map.getLayer(haloLineLayerId) && map.getSource(haloSourceId)) {
    map.addLayer({
      id: haloLineLayerId,
      type: 'line',
      source: haloSourceId,
      minzoom: 13.5,
      paint: {
        'line-color': ['get', 'accentColor'],
        'line-width': ['case', ['get', 'isSelected'], 2.5, 1.5],
        'line-dasharray': [2, 2],
        'line-opacity': ['case', ['get', 'isSelected'], 0.85, 0.45],
      },
    });
  }
}

function getPolygonCentroid(ring: [number, number][]): [number, number] {
  let cx = 0;
  let cy = 0;
  const n =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  for (let i = 0; i < n; i++) {
    cx += ring[i][0];
    cy += ring[i][1];
  }
  return [cx / n, cy / n];
}

function getMinDistanceToRing(lng: number, lat: number, ring: [number, number][]): number {
  let minDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const dx = p[0] - lng;
    const dy = p[1] - lat;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

function getRealBuildingPolygon(
  map: mapboxgl.Map,
  lng: number,
  lat: number,
  vacancyId?: string
): BuildingPolygonResult | null {
  if (vacancyId && buildingPolygonCache.has(vacancyId)) {
    return buildingPolygonCache.get(vacancyId)!;
  }
  if (!map.isStyleLoaded()) return null;

  try {
    const pt = map.project([lng, lat]);
    const box: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [pt.x - 28, pt.y - 28],
      [pt.x + 28, pt.y + 28],
    ];

    // 1. Query rendered building vector features in local proximity box
    let features = map.queryRenderedFeatures(box, { layers: ['3d-buildings'] });
    if (!features || features.length === 0) {
      features = map.queryRenderedFeatures(box).filter(
        (f) =>
          f.sourceLayer === 'building' ||
          (f.properties && (f.properties.extrude === 'true' || f.properties.height))
      );
    }

    if (features && features.length > 0) {
      // Find the feature that actually contains the point or is closest
      let bestFeature: mapboxgl.MapboxGeoJSONFeature | null = null;

      for (const f of features) {
        let coordsList: [number, number][][] = [];
        if (f.geometry.type === 'Polygon') {
          coordsList = [f.geometry.coordinates[0] as [number, number][]];
        } else if (f.geometry.type === 'MultiPolygon') {
          coordsList = (f.geometry.coordinates as [number, number][][][]).map((poly) => poly[0]);
        }

        for (const ring of coordsList) {
          if (isPointInPolygon(lng, lat, ring)) {
            bestFeature = f;
            break;
          }
        }
        if (bestFeature) break;
      }

      // If point is slightly on the edge or sidewalk, find closest within max 25 meters (~0.0003 deg)
      if (!bestFeature) {
        let closestDist = Infinity;
        let closestFeature: mapboxgl.MapboxGeoJSONFeature | null = null;

        for (const f of features) {
          let coordsList: [number, number][][] = [];
          if (f.geometry.type === 'Polygon') {
            coordsList = [f.geometry.coordinates[0] as [number, number][]];
          } else if (f.geometry.type === 'MultiPolygon') {
            coordsList = (f.geometry.coordinates as [number, number][][][]).map((poly) => poly[0]);
          }

          for (const ring of coordsList) {
            const dist = getMinDistanceToRing(lng, lat, ring);
            if (dist < closestDist) {
              closestDist = dist;
              closestFeature = f;
            }
          }
        }

        if (closestDist <= 0.00032 && closestFeature) {
          bestFeature = closestFeature;
        }
      }

      if (!bestFeature) {
        return null;
      }

      const f = bestFeature;
      const rawHeight = Number(f.properties?.height) || 0;
      const height = rawHeight > 0 ? rawHeight : 16;

      let coords: [number, number][][];
      if (f.geometry.type === 'Polygon') {
        coords = f.geometry.coordinates as [number, number][][];
      } else if (f.geometry.type === 'MultiPolygon') {
        coords = (f.geometry.coordinates as [number, number][][][])[0];
      } else {
        return null;
      }

      const centroid = getPolygonCentroid(coords[0]);
      const result: BuildingPolygonResult = {
        coordinates: coords,
        height,
        centroid,
      };

      if (vacancyId) {
        buildingPolygonCache.set(vacancyId, result);
      }

      return result;
    }
  } catch (err) {
    console.warn('Could not query rendered building polygon:', err);
  }

  return null;
}

/**
 * Standard ray-casting point-in-polygon test
 */
function isPointInPolygon(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates a ground circle polygon around coordinates in meters
 */
function createCirclePolygon(lng: number, lat: number, radiusMeters = 50, points = 32): [number, number][] {
  const coords: [number, number][] = [];
  const distanceX = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusMeters / 111320;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  return coords;
}

/**
 * Renders user freehand drawn area with glowing semi-transparent fill and neon dashed border
 */
function renderDrawnAreaPolygon(map: mapboxgl.Map, polygon: [number, number][] | null | undefined) {
  if (!map.isStyleLoaded()) return;

  const sourceId = 'drawn-area-source';
  const fillLayerId = 'drawn-area-fill';
  const glowLayerId = 'drawn-area-glow';
  const lineLayerId = 'drawn-area-line';

  if (!polygon || polygon.length < 3) {
    if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
    if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    return;
  }

  // Ensure closed polygon ring
  const ring = [...polygon];
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  const geojson: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };

  const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(geojson);
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // 1. Semi-transparent glowing fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.18,
      },
    });

    // 2. Diffused outer blur glow
    map.addLayer({
      id: glowLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#2563eb',
        'line-width': 8,
        'line-blur': 5,
        'line-opacity': 0.55,
      },
    });

    // 3. Crisp neon dashed boundary
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#60a5fa',
        'line-width': 2.5,
        'line-dasharray': [2, 2],
        'line-opacity': 0.95,
      },
    });
  }
}
