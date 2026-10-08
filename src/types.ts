export interface Coordinates {
  lng: number;
  lat: number;
}

export interface PlaceInfo {
  id: string;
  name: string;
  place_name: string;
  coordinates: Coordinates;
  category?: string;
  address?: string;
  bbox?: [number, number, number, number];
}

export interface SearchResult {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  properties?: Record<string, any>;
  bbox?: [number, number, number, number];
}

export type TravelProfile = 'driving' | 'walking' | 'cycling';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: any; // GeoJSON LineString
  steps: RouteStep[];
  profile: TravelProfile;
}

export interface MapStyleOption {
  id: string;
  name: string;
  previewUrl: string;
  url: string;
  badge?: string;
  description: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  savedAt: number;
  note?: string;
}

export interface MeasurePoint {
  id: string;
  coordinates: Coordinates;
  distanceFromStart: number;
}

export type VacancyAttachmentType = 'building' | 'ground_zone';

export type VacancyCategory =
  | 'horeca'
  | 'parks_green'
  | 'retail'
  | 'delivery'
  | 'it_creative'
  | 'service';

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  employerName?: string; // "АДМИН" or "АДМИН (Компания)"
  salary: string;
  category: VacancyCategory;
  categoryLabel: string;
  attachmentType: VacancyAttachmentType;
  coordinates: Coordinates;
  address?: string;
  locationName: string;
  description: string;
  requirements: string[];
  schedule: string;
  payoutType: string;
  color: string;
  accentColor: string;
  iconType: 'tree' | 'coffee' | 'shopping' | 'delivery' | 'laptop' | 'wrench';
  buildingHeight?: number;
  zoneRadius?: number;
  createdAt?: number;
  createdByRole?: 'admin' | 'employer';
  /** Кто создал смену (пользовательские vac-custom-* можно снять с публикации) */
  createdByUserId?: string;
}

export type UserRole = 'user' | 'employer' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  companyName?: string;
  rating?: number;
  completedShifts?: number;
  punctuality?: string;
  tgUsername?: string;
  tgConnected?: boolean;
}

export type ApplicationWorkflowStatus = 'pending' | 'reviewing' | 'active' | 'rejected' | 'completed' | 'cancelled';
