import { useState, useRef, useEffect, useMemo } from 'react';
import type { Coordinates, Vacancy, UserRole } from './types';
import { getStoredMapboxToken, reverseGeocode } from './services/mapbox';
import { useTheme } from './hooks/useTheme';
import { dbStore } from './services/dbStore';
import { MapContainer } from './components/MapContainer';
import { NavigationControls } from './components/NavigationControls';
import { StreetVacanciesHeader } from './components/StreetVacanciesHeader';
import { BottomNavPill } from './components/BottomNavPill';
import { VacancyModal } from './components/VacancyModal';
import { NavigationSheet } from './components/NavigationSheet';
import type { ApplicationItem } from './models/application';
import { ProfileDropdownModal } from './components/ProfileDropdownModal';
import { AreaDrawOverlay } from './components/AreaDrawOverlay';
import { LandingPage } from './components/LandingPage';
import { CreateVacancyModal } from './components/CreateVacancyModal';
import { CompanyModal } from './components/CompanyModal';
import { AdminMembersModal } from './components/AdminMembersModal';
import GradualBlur from './components/GradualBlur';
import { isEmployerSide, isPlatformAdmin } from './utils/roles';
import { Users } from 'lucide-react';

function isPointInPolygon(pt: [number, number], poly: [number, number][]): boolean {
  const x = pt[0];
  const y = pt[1];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function App() {
  // Persistent DB store subscriptions
  const [isAuth, setIsAuth] = useState<boolean>(() => dbStore.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => dbStore.getCurrentUser());
  const [allVacancies, setAllVacancies] = useState<Vacancy[]>(() => dbStore.getVacancies());
  const [applications, setApplications] = useState<ApplicationItem[]>(() => dbStore.getApplications());
  const [isCreateVacancyOpen, setIsCreateVacancyOpen] = useState(false);
  const [isAdminMembersOpen, setIsAdminMembersOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const employerSide = isEmployerSide(currentUser.role);
  const platformAdmin = isPlatformAdmin(currentUser.role);

  useEffect(() => {
    return dbStore.subscribe(() => {
      setCurrentUser(dbStore.getCurrentUser());
      setIsAuth(dbStore.isAuthenticated());
      setAllVacancies(dbStore.getVacancies());
      setApplications(dbStore.getApplications());
    });
  }, []);

  useEffect(() => {
    return dbStore.subscribeLiveVacancy((vacancy) => {
      setLiveVacancy(vacancy);
      window.setTimeout(() => {
        setLiveVacancy((current) => (current?.id === vacancy.id ? null : current));
      }, 7000);
    });
  }, []);

  const [token] = useState<string>(getStoredMapboxToken);
  const { resolved: theme } = useTheme();
  const mapStyleUrl = useMemo(
    () =>
      theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12',
    [theme]
  );

  const [streetName, setStreetName] = useState('Сквер Адама Міцкевіча');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);

  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null);

  // Left-side panel tab: null = closed, 'jobs'|'applications'|'chats'|'profile'
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Applications interactive state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveVacancy, setLiveVacancy] = useState<Vacancy | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const matchesVacancy = (app: { id: string; vacancyId?: string }, vacancyId: string) =>
    app.vacancyId === vacancyId || app.id === `app::${currentUser.id}::${vacancyId}`;

  const handleApplyToVacancy = async (vacancy: Vacancy) => {
    const existing = applications.find((app) => matchesVacancy(app, vacancy.id));
    if (existing) {
      setSelectedAppId(existing.id);
      setActiveTab('applications');
      setSelectedVacancy(null);
      showToast(`Вы уже откликнулись на эту вакансию!`);
      return;
    }

    const newApp = await dbStore.applyToVacancy(vacancy);
    setSelectedAppId(newApp.id);
    setSelectedVacancy(null);
    setActiveTab('applications');
    showToast(`✓ Отклик отправлен работодателю (АДМИН)!`);
  };

  const handleCancelApplication = (id: string) => {
    dbStore.cancelApplication(id);
    showToast('Статус отклика обновлён');
  };

  const handleAdvanceStage = (id: string, step: number) => {
    dbStore.advanceStage(id, step);
  };

  const handleApproveApplication = (id: string) => {
    dbStore.approveApplication(id);
    showToast('✓ Отклик кандидата одобрен (назначена смена)!');
  };

  const handleRejectApplication = (id: string, reason?: string) => {
    dbStore.rejectApplication(id, reason);
    showToast('Статус заявки: Отказ');
  };

  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  const categoryFiltered = allVacancies.filter((vacancy) => {
    const status = vacancy.moderationStatus ?? 'published';
    if (status === 'published') return true;
    return currentUser.role === 'employer' && vacancy.createdByUserId === currentUser.id && status === 'pending';
  });
  const pendingVacancies = allVacancies.filter((vacancy) => vacancy.moderationStatus === 'pending');

  const filteredVacancies = drawnPolygon
    ? categoryFiltered.filter((v) =>
        isPointInPolygon([v.coordinates.lng, v.coordinates.lat], drawnPolygon)
      )
    : categoryFiltered;

  const handleToggleDrawArea = () => {
    if (isDrawMode) {
      setIsDrawMode(false);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.easeTo({
          pitch: 0,
          bearing: 0,
          zoom: Math.max(12.2, mapInstanceRef.current.getZoom() - 0.9),
          duration: 700,
        });
      }
      setIsDrawMode(true);
    }
  };

  const handleAreaDrawn = (polygon: [number, number][]) => {
    setDrawnPolygon(polygon);
    setIsDrawMode(false);
  };

  const handleClearDrawnArea = () => {
    setDrawnPolygon(null);
    setIsDrawMode(false);
  };

  const handleMapLoaded = (map: mapboxgl.Map) => {
    mapInstanceRef.current = map;
    const coords = userCoordsRef.current;
    if (coords) {
      map.flyTo({ center: [coords.lng, coords.lat], zoom: 15.5, pitch: 55, duration: 1200 });
    }
  };

  useEffect(() => {
    if (!isAuth) return;
    handleGeolocate();
    // Ask once after login. The button calls the same handler again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut({ duration: 300 });

  const userCoordsRef = useRef<Coordinates | null>(null);

  const applyUserCoords = async (coords: Coordinates) => {
    userCoordsRef.current = coords;
    setUserCoords(coords);
    mapInstanceRef.current?.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 15.5,
      pitch: 55,
      duration: 1500,
    });
    const geo = await reverseGeocode(coords, token);
    if (geo?.title) setStreetName(geo.title);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast('Браузер не отдаёт геолокацию');
      return;
    }
    if (!window.isSecureContext) {
      showToast('Гео работает только на https или localhost');
      return;
    }

    showToast('Определяем, где вы…');

    const coarse: PositionOptions = { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 };
    const precise: PositionOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void applyUserCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      },
      (error) => {
        if (error.code !== error.TIMEOUT && error.code !== error.POSITION_UNAVAILABLE) {
          showToast('Разрешите доступ к геопозиции в браузере');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            void applyUserCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
          },
          () => showToast('Не удалось определить место. Разрешите геопозицию и повторите'),
          precise
        );
      },
      coarse
    );
  };

  const handleSelectVacancy = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setActiveTab(null); // close side panel when vacancy selected
    setStreetName(vacancy.locationName);
  };

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedVacancyLocation, setPickedVacancyLocation] = useState<{ coords: Coordinates; name: string; address?: string } | null>(null);

  // Map click → if picking location for vacancy, reverse-geocode point; otherwise deselect
  const handleMapClick = async (coords: Coordinates) => {
    const lastMarkerClick = (window as any).__lastMarkerClickTime as number | undefined;
    if (typeof lastMarkerClick === 'number' && Date.now() - lastMarkerClick < 600) {
      return;
    }

    if (isPickingLocation) {
      showToast('Определение адреса точки...');
      const geo = await reverseGeocode(coords, token);
      const title = geo?.title || `Точка на карте`;
      const fullAddress = geo?.fullAddress || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

      setPickedVacancyLocation({
        coords,
        name: title,
        address: fullAddress,
      });
      setIsPickingLocation(false);
      setIsCreateVacancyOpen(true);
      showToast(`✓ Локация выбрана: ${title}`);
      return;
    }
    setSelectedVacancy(null);
  };

  const geocodeTimeoutRef = useRef<number | null>(null);
  const [viewportInfo, setViewportInfo] = useState<{
    center: Coordinates;
    zoom: number;
    bounds?: { north: number; south: number; east: number; west: number };
  }>({
    center: { lng: 27.5615, lat: 53.9045 },
    zoom: 14.2,
  });

  const handleViewportChange = (viewport: {
    center: Coordinates;
    zoom: number;
    bearing: number;
    pitch: number;
    bounds?: { north: number; south: number; east: number; west: number };
  }) => {
    setViewportInfo(viewport);
    if (selectedVacancy) return;
    if (geocodeTimeoutRef.current !== null) window.clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = window.setTimeout(async () => {
      const geo = await reverseGeocode(viewport.center, token);
      if (geo?.title) setStreetName(geo.title);
    }, 450);
  };

  // Dynamic nearby vacancies: visible on-screen or within ~3.5km (15-20 min walk/transit)
  const nearbyVacancies = filteredVacancies
    .filter((v) => {
      if (viewportInfo.bounds) {
        const { north, south, east, west } = viewportInfo.bounds;
        const latPad = (north - south) * 0.40;
        const lngPad = (east - west) * 0.40;
        if (
          v.coordinates.lat <= north + latPad &&
          v.coordinates.lat >= south - latPad &&
          v.coordinates.lng <= east + lngPad &&
          v.coordinates.lng >= west - lngPad
        ) {
          return true;
        }
      }
      const dist = getDistanceMeters(
        viewportInfo.center.lat,
        viewportInfo.center.lng,
        v.coordinates.lat,
        v.coordinates.lng
      );
      return dist <= 3500;
    })
    .sort((a, b) => {
      const dA = getDistanceMeters(viewportInfo.center.lat, viewportInfo.center.lng, a.coordinates.lat, a.coordinates.lng);
      const dB = getDistanceMeters(viewportInfo.center.lat, viewportInfo.center.lng, b.coordinates.lat, b.coordinates.lng);
      return dA - dB;
    });

  const handleTabChange = (tab: string) => {
    // Toggle: clicking same tab closes panel, 'map' closes panel
    if (tab === 'map' || tab === activeTab) {
      setActiveTab(null);
    } else {
      setSelectedVacancy(null);
      setActiveTab(tab);
    }
  };

  // If not logged in, render the external Landing Page with Auth Panel
  if (!isAuth) {
    return (
      <LandingPage
        onEnterApp={(role) => {
          setIsAuth(true);
          showToast(
            role === 'admin'
              ? 'Добро пожаловать в панель АДМИНА!'
              : role === 'employer'
                ? 'Добро пожаловать, работодатель!'
                : 'Добро пожаловать в Halty!'
          );
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden select-none bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Map */}
      <MapContainer
        token={token}
        styleUrl={mapStyleUrl}
        is3DBuildings={true}
        selectedPlace={null}
        selectedVacancy={selectedVacancy}
        vacancies={filteredVacancies}
        userCoords={userCoords}
        drawnPolygon={drawnPolygon}
        isDrawMode={isDrawMode}
        onSelectVacancy={handleSelectVacancy}
        onDeselectVacancy={() => setSelectedVacancy(null)}
        onMapClick={handleMapClick}
        onViewportChange={handleViewportChange}
        onMapLoaded={handleMapLoaded}
      />

      {/* Freehand Area Draw */}
      <AreaDrawOverlay
        map={mapInstanceRef.current}
        isActive={isDrawMode}
        onAreaDrawn={handleAreaDrawn}
        onCancel={() => setIsDrawMode(false)}
      />

      {/* Drawn area badge */}
      {drawnPolygon && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-slate-950/85 glass-noise-dark text-white rounded-full shadow-2xl border border-blue-500/50">
          <span className="text-xs font-semibold flex items-center gap-2 relative z-[2]">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            Область: <strong className="text-blue-300 font-bold">{filteredVacancies.length}</strong>{' '}
            {filteredVacancies.length === 1 ? 'вакансия' : filteredVacancies.length < 5 ? 'вакансии' : 'вакансий'}
          </span>
          <button
            onClick={handleClearDrawnArea}
            className="relative z-[2] text-[11px] font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-colors ml-1 cursor-pointer"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Gradual blur overlays with noise texture */}
      <GradualBlur target="parent" position="top" height="8.5rem" strength={2.8} divCount={4} curve="bezier" exponential opacity={1} zIndex={10} />
      <GradualBlur target="parent" position="bottom" height="7.5rem" strength={2.8} divCount={4} curve="bezier" exponential opacity={1} zIndex={10} />
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-950/40 dark:from-slate-950/60 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-950/40 dark:from-slate-950/60 to-transparent pointer-events-none z-10" />

      {/* Top-left: Street header */}
      <div className="absolute top-5 left-5 z-20 flex flex-col pointer-events-auto max-w-[calc(100vw-120px)]">
        {/* Street name + dynamic nearby vacancy count */}
        <StreetVacanciesHeader
          streetName={streetName}
          vacanciesCount={nearbyVacancies.length}
          onOpenList={() => handleTabChange('jobs')}
        />
      </div>

      {liveVacancy && (
        <button
          type="button"
          onClick={() => {
            setSelectedVacancy(liveVacancy);
            setLiveVacancy(null);
            mapInstanceRef.current?.flyTo({
              center: [liveVacancy.coordinates.lng, liveVacancy.coordinates.lat],
              zoom: 15.5,
              duration: 900,
            });
          }}
          className="live-vacancy-pop absolute top-24 left-1/2 z-40 w-[min(92vw,380px)] -translate-x-1/2 cursor-pointer rounded-3xl border border-emerald-300/80 bg-white px-4 py-3 text-left shadow-2xl dark:border-emerald-500/40 dark:bg-slate-900"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Новая смена на карте</div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{liveVacancy.title}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {liveVacancy.company} · {liveVacancy.salary} · {liveVacancy.locationName}
          </div>
        </button>
      )}

      {/* Top-right: Controls (Admin create button, Profile button) */}
      <div className="absolute top-5 right-5 z-20 pointer-events-auto flex items-center gap-2.5">
        {/* Admin Create Vacancy Button */}
        {platformAdmin && (
          <button
            onClick={() => setIsModerationOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer shadow-lg"
            title="Смены на одобрении"
          >
            <span className="hidden sm:inline">Модерация</span>
            <span>{pendingVacancies.length}</span>
          </button>
        )}
        {platformAdmin && (
          <button
            onClick={() => setIsAdminMembersOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/90 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-600/50 text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer shadow-lg"
            title="Работодатели и исполнители"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Участники</span>
          </button>
        )}
        {employerSide && (
          <button
            onClick={() => setIsCreateVacancyOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-white text-xs font-black tracking-wide transition-all active:scale-95 cursor-pointer border ${
              platformAdmin
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(147,51,234,0.4)] border-purple-400/30'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_4px_20px_rgba(245,158,11,0.35)] border-amber-400/30'
            }`}
            title="Создать новую вакансию"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Вакансия</span>
          </button>
        )}

        {/* Profile button */}
        <button
          onClick={() => handleTabChange('profile')}
          className={`h-11 rounded-full bg-white dark:bg-slate-900 border shadow-[0_8px_25px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.45)] flex items-center gap-2 transition-all active:scale-95 group cursor-pointer ${
            employerSide
              ? platformAdmin
                ? 'px-3.5 border-purple-300 dark:border-purple-500/40 ring-2 ring-purple-500/20'
                : 'px-3.5 border-amber-300 dark:border-amber-500/40 ring-2 ring-amber-500/20'
              : 'w-11 justify-center border-slate-200/90 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
          title="Мой профиль и настройки"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-inner group-hover:scale-105 transition-transform relative ${
              platformAdmin
                ? 'bg-gradient-to-tr from-purple-700 to-indigo-600'
                : currentUser.role === 'employer'
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-700'
                  : 'bg-slate-900'
            }`}
          >
            {currentUser.avatar}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ring-1 ${
                platformAdmin
                  ? 'bg-purple-400 ring-purple-300'
                  : currentUser.role === 'employer'
                    ? 'bg-amber-400 ring-amber-300'
                    : 'bg-emerald-500 ring-emerald-400'
              }`}
            />
          </div>

          {platformAdmin && (
            <span className="text-[11px] font-black tracking-wider text-purple-700 dark:text-purple-300 uppercase pr-0.5">
              АДМИН
            </span>
          )}
          {currentUser.role === 'employer' && (
            <span className="text-[11px] font-black tracking-wider text-amber-700 dark:text-amber-300 uppercase pr-0.5">
              HR
            </span>
          )}
        </button>
      </div>

      {/* Right: Navigation Controls (Zoom, Geolocation, Area Draw) */}
      <NavigationControls
        onGeolocate={handleGeolocate}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        isDrawMode={isDrawMode}
        onToggleDrawArea={handleToggleDrawArea}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 pointer-events-auto animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-950/90 text-white border border-slate-700 shadow-2xl backdrop-blur-md text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Bottom Nav Pill with dynamic applications badge */}
      <BottomNavPill
        activeTab={activeTab ?? 'map'}
        onTabChange={handleTabChange}
        applicationsBadge={applications.filter((a) => a.status !== 'cancelled').length}
        chatsBadge={applications.reduce((acc, a) => acc + (a.unread ? 1 : 0), 1)}
      />

      {/* Left-side Floating Rounded Panel */}
      <NavigationSheet
        activeTab={activeTab === 'profile' ? null : activeTab}
        vacancies={nearbyVacancies}
        applications={applications}
        userRole={currentUser.role}
        userCoords={userCoords}
        onClose={() => setActiveTab(null)}
        onSelectVacancy={handleSelectVacancy}
        onUpdateApplication={(updated) => {
          dbStore.updateApplication(updated);
        }}
        onCancelApplication={handleCancelApplication}
        onAdvanceStage={handleAdvanceStage}
        onApproveApplication={handleApproveApplication}
        onRejectApplication={handleRejectApplication}
        onOpenCreateVacancy={() => setIsCreateVacancyOpen(true)}
        selectedAppId={selectedAppId}
        onSelectAppId={setSelectedAppId}
      />

      {/* Profile Dropdown Modal with differentiated views for Admin vs Worker */}
      <ProfileDropdownModal
        isOpen={activeTab === 'profile'}
        onClose={() => setActiveTab(null)}
        onOpenHistory={() => setActiveTab('applications')}
        onOpenCreateVacancy={() => {
          setActiveTab(null);
          setIsCreateVacancyOpen(true);
        }}
        currentUser={currentUser}
        onOpenAdminMembers={platformAdmin ? () => setIsAdminMembersOpen(true) : undefined}
        onSwitchRole={(role: UserRole) => {
          dbStore.switchRole(role);
          const labels: Record<UserRole, string> = {
            admin: 'АДМИН',
            employer: 'Работодатель',
            user: 'Исполнитель',
          };
          showToast(`Демо-режим: ${labels[role]}`);
        }}
        onLogout={() => {
          dbStore.logout();
          setIsAuth(false);
          setActiveTab(null);
          showToast('Вы вышли из системы');
        }}
      />

      {/* Location Picker Banner when Admin picks a spot on map */}
      {isPickingLocation && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto animate-bounce">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-950/95 text-white border border-purple-500 shadow-2xl backdrop-blur-md text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span>📍 Нажмите на карту, чтобы выбрать точку для вакансии</span>
            <button
              type="button"
              onClick={() => {
                setIsPickingLocation(false);
                setIsCreateVacancyOpen(true);
              }}
              className="ml-2 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Admin Create Vacancy Modal */}
      <CreateVacancyModal
        isOpen={isCreateVacancyOpen}
        onClose={() => setIsCreateVacancyOpen(false)}
        currentMapCenter={viewportInfo.center}
        pickedLocation={pickedVacancyLocation}
        onStartPickOnMap={() => {
          setIsCreateVacancyOpen(false);
          setIsPickingLocation(true);
          showToast('📍 Нажмите в любое место на карте, чтобы поставить метку');
        }}
        onCreateVacancy={(data) => {
          const newVac = dbStore.addVacancy(data);
          setIsCreateVacancyOpen(false);
          setPickedVacancyLocation(null);
          setSelectedVacancy(newVac);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({
              center: [newVac.coordinates.lng, newVac.coordinates.lat],
              zoom: 16,
              pitch: 60,
              duration: 1200,
            });
          }
          showToast(
            newVac.moderationStatus === 'pending'
              ? 'Смена отправлена админу на одобрение'
              : '✓ Вакансия опубликована на карте'
          );
        }}
      />

      {isModerationOpen && platformAdmin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Смены на одобрении</h2>
              <button
                type="button"
                onClick={() => setIsModerationOpen(false)}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Закрыть
              </button>
            </div>
            {pendingVacancies.length === 0 ? (
              <p className="text-sm text-slate-500">Новых смен от работодателей нет.</p>
            ) : (
              <div className="space-y-3">
                {pendingVacancies.map((vacancy) => (
                  <div key={vacancy.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{vacancy.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {vacancy.company} · {vacancy.salary} · {vacancy.locationName}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          dbStore.moderateVacancy(vacancy.id, 'published');
                          showToast(`«${vacancy.title}» опубликована на карте`);
                        }}
                        className="px-3 py-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                      >
                        Одобрить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dbStore.moderateVacancy(vacancy.id, 'rejected');
                          showToast(`«${vacancy.title}» отклонена`);
                        }}
                        className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vacancy detail card with live apply & view application status */}
      {selectedVacancy && (
        <VacancyModal
          vacancy={selectedVacancy}
          onClose={() => setSelectedVacancy(null)}
          onApply={handleApplyToVacancy}
          isApplied={applications.some((a) => matchesVacancy(a, selectedVacancy.id))}
          onViewApplication={() => {
            const match = applications.find((a) => matchesVacancy(a, selectedVacancy.id));
            if (match) setSelectedAppId(match.id);
            setActiveTab('applications');
            setSelectedVacancy(null);
          }}
          onOpenCompany={(company) => setSelectedCompany(company)}
          onDeleted={() => {
            setSelectedVacancy(null);
            showToast('Смена снята с карты');
          }}
        />
      )}

      {/* Company Profile Modal */}
      {selectedCompany && (
        <CompanyModal
          isOpen={true}
          companyName={selectedCompany}
          vacancies={allVacancies}
          onClose={() => setSelectedCompany(null)}
          onApplyVacancy={(vac) => {
            handleApplyToVacancy(vac);
            setSelectedCompany(null);
          }}
        />
      )}

      <AdminMembersModal isOpen={isAdminMembersOpen} onClose={() => setIsAdminMembersOpen(false)} />
    </div>
  );
}

export default App;
