import type { Coordinates, MapStyleOption, RouteInfo, SearchResult, TravelProfile } from '../types';

export const DEFAULT_MAPBOX_TOKEN =
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

const TOKEN_STORAGE_KEY = 'halty_mapbox_access_token';

export function getStoredMapboxToken(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  }

  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (envToken && typeof envToken === 'string' && envToken.trim().length > 0 && !envToken.includes('your_mapbox_token_here')) {
    return envToken.trim();
  }

  return DEFAULT_MAPBOX_TOKEN;
}

export function saveMapboxToken(token: string): void {
  if (typeof window === 'undefined') return;
  if (!token || token.trim() === '' || token.trim() === DEFAULT_MAPBOX_TOKEN) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
  }
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'streets',
    name: 'Схема (Streets)',
    url: 'mapbox://styles/mapbox/streets-v12',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Классическая детальная векторная карта с дорогами, зданиями и POI',
    badge: 'По умолчанию',
  },
  {
    id: 'satellite-streets',
    name: 'Спутник (Hybrid)',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Высокодетальные спутниковые снимки с наложением дорожной сети и меток',
    badge: 'Спутник',
  },
  {
    id: 'outdoors',
    name: 'Топография (Outdoors)',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Оптимизирована для пеших прогулок, рельефа и природы с изолиниями высот',
  },
  {
    id: 'dark',
    name: 'Тёмная (Dark)',
    url: 'mapbox://styles/mapbox/dark-v11',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Контрастная тёмная тема, комфортная для глаз в ночное время',
    badge: 'Ночь',
  },
  {
    id: 'light',
    name: 'Светлая (Light)',
    url: 'mapbox://styles/mapbox/light-v11',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/light-v11/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Минималистичная светлая палитра для чистого визуального восприятия',
  },
  {
    id: 'navigation-day',
    name: 'Навигатор День',
    url: 'mapbox://styles/mapbox/navigation-day-v1',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Специальная палитра для автомобильной навигации с чёткими указателями',
  },
  {
    id: 'navigation-night',
    name: 'Навигатор Ночь',
    url: 'mapbox://styles/mapbox/navigation-night-v1',
    previewUrl: 'https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/static/27.5615,53.9045,12,0/200x120?access_token=',
    description: 'Навигационный режим с низкой яркостью для безопасного вождения ночью',
  },
];

export async function searchPlaces(
  query: string,
  token: string,
  proximity?: [number, number]
): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const endpoint = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json`
  );
  endpoint.searchParams.set('access_token', token);
  endpoint.searchParams.set('language', 'ru,en');
  endpoint.searchParams.set('limit', '7');
  if (proximity) {
    endpoint.searchParams.set('proximity', `${proximity[0]},${proximity[1]}`);
  }

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      // If Mapbox geocoding fails (e.g. rate limit or token scope), fallback to Nominatim
      return await fallbackSearchNominatim(cleanQuery);
    }
    const data = await response.json();
    if (!data.features) return [];

    return data.features.map((feature: any) => ({
      id: feature.id,
      text: feature.text,
      place_name: feature.place_name,
      center: feature.center,
      place_type: feature.place_type || [],
      properties: feature.properties,
      bbox: feature.bbox,
    }));
  } catch (error) {
    console.warn('Mapbox geocoding error, falling back to Nominatim:', error);
    return await fallbackSearchNominatim(cleanQuery);
  }
}

const styleCustomizationEpoch = new WeakMap<object, number>();
let styleCustomizationAppliedEpoch = new WeakMap<object, number>();

/** Call after map.setStyle() so label customization runs again on the new style. */
export function invalidateMapStyleCustomizations(map: object): void {
  const next = (styleCustomizationEpoch.get(map) ?? 0) + 1;
  styleCustomizationEpoch.set(map, next);
}

/** Applies Russian labels + minimal map styling once per style load (cheap on repeated calls). */
export function applyMapStyleCustomizations(map: any): void {
  if (!map) return;

  // POI layers can appear after the first style pass — always re-apply clutter removal.
  cleanAndFilterMapLabels(map);

  const epoch = styleCustomizationEpoch.get(map) ?? 0;
  if (styleCustomizationAppliedEpoch.get(map) === epoch) return;

  localizeMapToRussian(map);
  styleCustomizationAppliedEpoch.set(map, epoch);

  if (!map._haltyPoiFilterHook) {
    map._haltyPoiFilterHook = true;
    let filterTimer: number | null = null;
    map.on('styledata', () => {
      if (filterTimer !== null) window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(() => cleanAndFilterMapLabels(map), 50);
    });
  }
}

export function localizeMapToRussian(map: any): void {
  if (!map) return;
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    for (const layer of style.layers) {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_ru'],
            ['get', 'name:ru'],
            ['get', 'name'],
          ]);
        } catch {
          // ignore expression exceptions on custom formatted layers
        }
      }
    }
  } catch (err) {
    console.warn('Could not localize map layers to Russian:', err);
  }
}

function isEssentialLabelLayer(id: string): boolean {
  return (
    id.includes('road-label') ||
    (id.includes('transit') && !id.includes('airport'))
  );
}

function isPoiSymbolLayer(layer: { id: string; 'source-layer'?: string }): boolean {
  const id = layer.id.toLowerCase();
  const sourceLayer = (layer['source-layer'] || '').toLowerCase();
  return sourceLayer === 'poi_label' || id.includes('poi-label') || id.includes('poi_label');
}

/**
 * Minimal map labels: street names, bus stops, and metro stations only.
 * Hides settlements, landmarks, shops, churches, attractions, and other POI clutter.
 */
export function cleanAndFilterMapLabels(map: any): void {
  if (!map) return;
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase();

      // Hide default Mapbox building layers; custom 3d-buildings + vacancy layers stay visible.
      if (
        (layer.type === 'fill' || layer.type === 'fill-extrusion') &&
        id.includes('building') &&
        id !== '3d-buildings' &&
        !id.startsWith('vacancy-')
      ) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch {}
        continue;
      }

      if (layer.type !== 'symbol') continue;

      // Hide all Mapbox POI icons/labels (shops, churches, museums, etc.).
      // Transit stops live in transit-stop-label and stay visible via isEssentialLabelLayer.
      if (isPoiSymbolLayer(layer)) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch {}
        continue;
      }

      if (!id.includes('label') && !id.includes('poi') && !id.includes('shield')) continue;

      try {
        map.setLayoutProperty(layer.id, 'visibility', isEssentialLabelLayer(id) ? 'visible' : 'none');
      } catch {}
    }
  } catch (err) {
    console.warn('Could not filter map labels:', err);
  }
}

export async function reverseGeocode(
  coordinates: Coordinates,
  token: string
): Promise<{ title: string; subtitle: string; fullAddress: string } | null> {
  const endpoint = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json`
  );
  endpoint.searchParams.set('access_token', token);
  endpoint.searchParams.set('language', 'ru');
  endpoint.searchParams.set('limit', '1');

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return {
        title: `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
        subtitle: 'Выбранная точка на карте',
        fullAddress: `${coordinates.lat.toFixed(6)}° N, ${coordinates.lng.toFixed(6)}° E`,
      };
    }
    const feature = data.features[0];
    return {
      title: feature.text || feature.place_name.split(',')[0],
      subtitle: feature.place_name.split(',').slice(1).join(',').trim() || 'Координаты точки',
      fullAddress: feature.place_name,
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return {
      title: `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
      subtitle: 'Точка на карте',
      fullAddress: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
    };
  }
}

async function fallbackSearchNominatim(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=6&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'ru,en',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({
      id: `osm-${item.place_id}`,
      text: item.display_name.split(',')[0],
      place_name: item.display_name,
      center: [parseFloat(item.lon), parseFloat(item.lat)],
      place_type: [item.type || 'place'],
      bbox: item.boundingbox
        ? [
            parseFloat(item.boundingbox[2]),
            parseFloat(item.boundingbox[0]),
            parseFloat(item.boundingbox[3]),
            parseFloat(item.boundingbox[1]),
          ]
        : undefined,
    }));
  } catch (e) {
    console.error('Nominatim fallback failed:', e);
    return [];
  }
}

export async function fetchDirections(
  origin: Coordinates,
  destination: Coordinates,
  profile: TravelProfile = 'driving',
  token: string
): Promise<RouteInfo | null> {
  const profileMap: Record<TravelProfile, string> = {
    driving: 'mapbox/driving',
    walking: 'mapbox/walking',
    cycling: 'mapbox/cycling',
  };

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/${profileMap[profile]}/${coords}`
  );
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('language', 'ru');
  url.searchParams.set('access_token', token);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Directions API error ${response.status}`);
    }
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const steps = (route.legs?.[0]?.steps || []).map((step: any) => ({
      instruction: step.maneuver?.instruction || step.name || 'Продолжайте движение',
      distance: step.distance,
      duration: step.duration,
      maneuver: {
        type: step.maneuver?.type,
        modifier: step.maneuver?.modifier,
        location: step.maneuver?.location,
      },
    }));

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps,
      profile,
    };
  } catch (err) {
    console.error('Route calculation failed:', err);
    return null;
  }
}

// Calculates distance between two points in meters (Haversine formula)
export function calculateHaversineDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} ч ${remainingMins} мин` : `${hours} ч`;
}
