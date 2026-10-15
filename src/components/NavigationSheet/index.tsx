import './styles.css';
import '../PanelScroll/styles.css';
import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  X, Briefcase, MessageSquare, Heart, Search,
  MapPin, ChevronRight, ArrowLeft, Send, Paperclip,
  User, Clock, Wallet, CheckCircle2,
  XCircle, Phone, Building2, TrendingUp, History,
  FileCheck2, ShieldAlert, RefreshCw, ClipboardList,
} from 'lucide-react';
import type { Vacancy, Coordinates, UserRole } from '../../types';
import type { ApplicationItem } from '../../models/application';
import { isEmployerSide } from '../../utils/roles';
import { dbStore } from '../../services/dbStore';
import {
  getStoredMapboxToken,
  calculateHaversineDistance,
  formatDistance,
  applyMapStyleCustomizations,
} from '../../services/mapbox';
import { IconButton } from '../Button';

function findVacancyForApplication(app: ApplicationItem, vacancies: Vacancy[]): Vacancy | null {
  if (app.vacancyId) {
    const byVacancyId = vacancies.find((vacancy) => vacancy.id === app.vacancyId);
    if (byVacancyId) return byVacancyId;
  }

  if (app.id.startsWith('app::')) {
    const vacId = app.id.split('::').slice(2).join('::');
    const byId = vacancies.find((v) => v.id === vacId);
    if (byId) return byId;
  }

  if (app.id.startsWith('app-vac-')) {
    const vacId = app.id.slice('app-vac-'.length);
    const byId = vacancies.find((v) => v.id === vacId);
    if (byId) return byId;
  }

  const roleLower = app.role.toLowerCase();
  const byTitle = vacancies.find((v) => v.title.toLowerCase() === roleLower);
  if (byTitle) return byTitle;

  const companyLower = app.company.toLowerCase();
  const byCompany = vacancies.filter((v) => v.company.toLowerCase() === companyLower);
  if (byCompany.length === 1) return byCompany[0];

  if (app.coordinates) {
    const nearby = vacancies
      .map((v) => ({
        v,
        d: calculateHaversineDistance(app.coordinates!, v.coordinates),
      }))
      .filter(({ d }) => d < 250)
      .sort((a, b) => a.d - b.d);
    if (nearby.length > 0) return nearby[0].v;
  }

  const appLoc = app.location.toLowerCase();
  const byLocation = vacancies.find((v) => {
    const loc = v.locationName.toLowerCase();
    return appLoc.includes(loc) || loc.includes(appLoc);
  });
  if (byLocation) return byLocation;

  return null;
}

function applicationToVacancyFallback(app: ApplicationItem): Vacancy {
  return {
    id: app.id.startsWith('app-vac-') ? app.id.slice('app-vac-'.length) : `from-app-${app.id}`,
    title: app.role,
    company: app.company,
    employerName: 'АДМИН',
    salary: app.salary,
    category: 'service',
    categoryLabel: 'Подработка',
    attachmentType: 'ground_zone',
    coordinates: app.coordinates ?? { lng: 27.5615, lat: 53.9023 },
    locationName: app.location,
    description: app.description,
    requirements: app.requirementsNotes ?? [],
    schedule: app.scheduleDate,
    payoutType: 'За смену',
    color: app.color,
    accentColor: app.color,
    iconType: 'wrench',
    createdByRole: 'admin',
  };
}

/* ─── Main Navigation Sheet Container ────────────────────────────── */

interface NavigationSheetProps {
  activeTab: string | null;
  vacancies: Vacancy[];
  applications: ApplicationItem[];
  userRole?: UserRole;
  userCoords?: Coordinates | null;
  onClose: () => void;
  onSelectVacancy: (vacancy: Vacancy) => void;
  onUpdateApplication: (app: ApplicationItem) => void;
  onCancelApplication: (id: string) => void;
  onAdvanceStage: (id: string, step: number) => void;
  onApproveApplication?: (id: string) => void;
  onRejectApplication?: (id: string, reason?: string) => void;
  onOpenCreateVacancy?: () => void;
  selectedAppId?: string | null;
  onSelectAppId?: (id: string | null) => void;
  isStatic?: boolean;
}

export const NavigationSheet: React.FC<NavigationSheetProps> = ({
  activeTab,
  vacancies,
  applications,
  userRole = 'user',
  userCoords = null,
  onClose,
  onSelectVacancy,
  onUpdateApplication,
  onCancelApplication,
  onAdvanceStage,
  onApproveApplication,
  onRejectApplication,
  onOpenCreateVacancy,
  selectedAppId = null,
  onSelectAppId,
  isStatic = false,
}) => {
  const isOpen = activeTab !== null && activeTab !== 'map';

  if (isStatic) {
    return (
      <div className="w-full max-w-[440px] h-[640px] bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_20px_60px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)] border border-slate-200/90 dark:border-slate-700/90 flex flex-col overflow-hidden relative">
        {activeTab === 'jobs' && (
          <JobsContent
            vacancies={vacancies}
            onSelectVacancy={onSelectVacancy}
            onClose={onClose}
            userRole={userRole}
            onOpenCreateVacancy={onOpenCreateVacancy}
          />
        )}
        {activeTab === 'applications' && (
          <ApplicationsView
            applications={applications}
            userCoords={userCoords}
            onClose={onClose}
            onUpdate={onUpdateApplication}
            onCancel={onCancelApplication}
            onAdvance={onAdvanceStage}
            onApprove={onApproveApplication}
            onReject={onRejectApplication}
            userRole={userRole}
            selectedAppId={selectedAppId}
            onSelectAppId={onSelectAppId}
          />
        )}
        {activeTab === 'chats' && (
          <ChatsListView
            applications={applications}
            vacancies={vacancies}
            onClose={onClose}
            onUpdate={onUpdateApplication}
            onSelectVacancy={onSelectVacancy}
            userRole={userRole}
          />
        )}
        {activeTab === 'favorites' && (
          <FavoritesContent vacancies={vacancies} onSelectVacancy={onSelectVacancy} onClose={onClose} />
        )}
        {activeTab === 'profile' && <ProfileContent onClose={onClose} />}
      </div>
    );
  }

  return (
    <>
      {/* Dim backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
        }`}
      />

      {/* Floating rounded window with uniform margins */}
      <div
        className={`fixed left-4 sm:left-5 top-4 sm:top-5 bottom-24 sm:bottom-6 z-50 flex transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-x-6 scale-[0.98] pointer-events-none invisible'
        }`}
        style={{ width: 'min(440px, calc(100vw - 2rem))' }}
      >
        <div className={`w-full h-full bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_20px_60px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)] border border-slate-200/90 dark:border-slate-700/90 flex flex-col overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {activeTab === 'jobs' && (
            <JobsContent
              vacancies={vacancies}
              onSelectVacancy={onSelectVacancy}
              onClose={onClose}
              userRole={userRole}
              onOpenCreateVacancy={onOpenCreateVacancy}
            />
          )}
          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              userCoords={userCoords}
              onClose={onClose}
              onUpdate={onUpdateApplication}
              onCancel={onCancelApplication}
              onAdvance={onAdvanceStage}
              onApprove={onApproveApplication}
              onReject={onRejectApplication}
              userRole={userRole}
              selectedAppId={selectedAppId}
              onSelectAppId={onSelectAppId}
            />
          )}
          {activeTab === 'chats' && (
            <ChatsListView
              applications={applications}
              vacancies={vacancies}
              onClose={onClose}
              onUpdate={onUpdateApplication}
              onSelectVacancy={onSelectVacancy}
              userRole={userRole}
            />
          )}
          {activeTab === 'favorites' && (
            <FavoritesContent vacancies={vacancies} onSelectVacancy={onSelectVacancy} onClose={onClose} />
          )}
          {activeTab === 'profile' && <ProfileContent onClose={onClose} />}
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   1. JOBS LIST CONTENT
═══════════════════════════════════════════════════════════════════ */
const JobsContent: React.FC<{
  vacancies: Vacancy[];
  onSelectVacancy: (v: Vacancy) => void;
  onClose: () => void;
  userRole?: UserRole;
  onOpenCreateVacancy?: () => void;
}> = ({ vacancies, onSelectVacancy, onClose, userRole = 'user', onOpenCreateVacancy }) => {
  const [search, setSearch] = useState('');

  const filtered = vacancies.filter(
    (v) =>
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.locationName.toLowerCase().includes(search.toLowerCase()) ||
      v.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">Вакансии поблизости</h2>
            <p className="text-xs text-slate-500 mt-0.5">{filtered.length} предложений в радиусе обзора</p>
          </div>
        </div>
        <IconButton onClick={onClose} aria-label="Закрыть"><X className="w-4 h-4" /></IconButton>
      </div>

      {/* Admin Quick Action: Create Vacancy */}
      {isEmployerSide(userRole ?? 'user') && (
        <div className="px-4 pt-3 pb-1 border-b border-slate-100 dark:border-slate-700 bg-purple-50/50 dark:bg-purple-950/30">
          <button
            onClick={() => {
              onClose();
              onOpenCreateVacancy?.();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            <span>+ Создать вакансию (АДМИН)</span>
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-600 px-3.5 py-2.5 rounded-2xl shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Поиск по названию или компании…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="cursor-pointer">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto panel-scroll px-3.5 py-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Вакансий поблизости не найдено</p>
            <p className="text-xs text-slate-400 mt-1">Попробуйте приблизить или сдвинуть карту</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vac) => (
              <button
                key={vac.id}
                onClick={() => {
                  onSelectVacancy(vac);
                  onClose();
                }}
                className="w-full text-left group flex items-start gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                  style={{ background: vac.color + '18', border: `1.5px solid ${vac.color}40` }}
                >
                  <Building2 className="w-5 h-5" style={{ color: vac.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {vac.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 truncate">{vac.company}</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                      АДМИН
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 min-w-0">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg text-white shadow-xs shrink-0 whitespace-nowrap"
                      style={{ backgroundColor: vac.color }}
                    >
                      {vac.salary}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium min-w-0 flex-1 overflow-hidden">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{vac.locationName}</span>
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all mt-3.5 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   2. APPLICATIONS / CHATS (Screenshots 2 & 3 in Light Theme)
═══════════════════════════════════════════════════════════════════ */
const ApplicationsView: React.FC<{
  applications: ApplicationItem[];
  userCoords?: Coordinates | null;
  onClose: () => void;
  onUpdate: (app: ApplicationItem) => void;
  onCancel: (id: string) => void;
  onAdvance: (id: string, step: number) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason?: string) => void;
  userRole?: UserRole;
  selectedAppId?: string | null;
  onSelectAppId?: (id: string | null) => void;
}> = ({
  applications,
  userCoords = null,
  onClose,
  onUpdate,
  onCancel,
  onAdvance,
  onApprove,
  onReject,
  userRole = 'user',
  selectedAppId,
  onSelectAppId,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(selectedAppId ?? null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'history'>('all');

  const currentSelectedId = selectedAppId !== undefined ? selectedAppId : internalSelectedId;
  const setAppId = onSelectAppId || setInternalSelectedId;

  const selectedApp = applications.find((a) => a.id === currentSelectedId) || null;

  if (selectedApp) {
    return (
      <ApplicationDetailView
        app={selectedApp}
        userCoords={userCoords}
        onBack={() => setAppId(null)}
        onClose={onClose}
        onCancel={() => onCancel(selectedApp.id)}
        onAdvance={(step) => onAdvance(selectedApp.id, step)}
        onApprove={() => onApprove?.(selectedApp.id)}
        onReject={(reason) => onReject?.(selectedApp.id, reason)}
        userRole={userRole}
        onUpdate={onUpdate}
      />
    );
  }

  const activeCount = applications.filter((a) => a.status === 'active').length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const displayList = filterType === 'history'
    ? applications.filter((a) => a.status === 'cancelled')
    : applications;

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-900 relative">
      {/* Top Bar matching Screenshot 2 */}
      <div className="p-5 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isEmployerSide(userRole ?? 'user') ? 'Заявки соискателей' : 'Отклики'}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {isEmployerSide(userRole ?? 'user')
              ? `${pendingCount} ждут решения АДМИНА, ${activeCount} одобрено`
              : `${activeCount} активная подработка, ${pendingCount} ожидает`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <IconButton onClick={onClose} aria-label="Закрыть"><X className="w-4 h-4" /></IconButton>
        </div>
      </div>

      {/* Sub-header actions: Статистика + История */}
      <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
        <button
          onClick={() => setShowStatsModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-100 transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Статистика</span>
        </button>

        <button
          onClick={() => setFilterType((t) => (t === 'all' ? 'history' : 'all'))}
          className={`p-2 rounded-xl border transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
            filterType === 'history'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
          }`}
          title="История откликов"
        >
          <History className="w-4 h-4" />
          {filterType === 'history' && <span>История</span>}
        </button>
      </div>

      {/* Applications Cards List matching Screenshot 2 */}
      <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-3">
        {displayList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Список пуст</p>
          </div>
        ) : (
          displayList.map((app) => (
            <div
              key={app.id}
              onClick={() => setAppId(app.id)}
              className="group relative p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 shadow-[0_8px_25px_rgba(24,29,56,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_36px_rgba(24,29,56,0.1)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)] hover:border-slate-300 dark:hover:border-slate-500 transition-all cursor-pointer active:scale-[0.99]"
            >
              {/* Top row: Title + Status pill */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <h3 className="text-base font-black text-[#181D38] leading-snug group-hover:text-blue-600 transition-colors">
                  {app.role}
                </h3>

                {/* Status Badge from Screenshot 2 */}
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs ${
                    app.status === 'active'
                      ? 'bg-[#181D38] text-white'
                      : app.status === 'pending'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      app.status === 'active'
                        ? 'bg-emerald-400'
                        : app.status === 'pending'
                        ? 'bg-slate-950'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{app.statusLabel}</span>
                </div>
              </div>

              {/* Info rows matching Screenshot 2 */}
              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{app.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-black text-[#181D38]">{app.salary}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{app.scheduleDate}</span>
                </div>
              </div>

              {/* Requirements tags (from screenshot: медсправка, 14 лет) */}
              {app.requirementsNotes && app.requirementsNotes.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                  {app.requirementsNotes.map((note, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-bold">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin quick actions */}
              {isEmployerSide(userRole ?? 'user') && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  {app.status === 'pending' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove?.(app.id);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Одобрить смену</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject?.(app.id, 'Смена укомплектована');
                        }}
                        className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Отказать</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">
                      Решение АДМИНА зафиксировано ({app.statusLabel})
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Статистика */}
      {showStatsModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 w-full max-w-[360px] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Статистика соискателя</h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-xl font-black text-emerald-700 block">1 240 Br</span>
                <span className="text-[11px] font-semibold text-emerald-600">Заработано</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-xl font-black text-blue-700 block">8</span>
                <span className="text-[11px] font-semibold text-blue-600">Смен выполнено</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-xl font-black text-amber-700 block">4.9 ★</span>
                <span className="text-[11px] font-semibold text-amber-600">Рейтинг (12 отзывов)</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <span className="text-xl font-black text-indigo-700 block">100%</span>
                <span className="text-[11px] font-semibold text-indigo-600">Пунктуальность</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Вы входите в топ-5% лучших исполнителей сервиса по Минску за этот месяц.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   3. APPLICATION DETAIL VIEW (Real Mini-Map & Dynamic Status)
═══════════════════════════════════════════════════════════════════ */
const STAGE_NAMES = ['Отправлен', 'Доставлен', 'Просмотрен', 'Подтверждён', 'Смена'];


const ApplicationMiniMap: React.FC<{
  targetCoords: Coordinates;
  userCoords?: Coordinates | null;
  walkTimeText: string;
  locationName: string;
  color?: string;
}> = ({ targetCoords, userCoords, walkTimeText, locationName, color = '#6366f1' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const token = getStoredMapboxToken();
    mapboxgl.accessToken = token;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [targetCoords.lng, targetCoords.lat],
        zoom: 14.8,
        interactive: true,
        attributionControl: false,
      });
      mapRef.current = map;
    } catch (e) {
      console.warn('MiniMap init error:', e);
      return;
    }

    map.on('load', () => {
      try {
        applyMapStyleCustomizations(map);
        map.resize();

        // Destination Marker
        const el = document.createElement('div');
        el.className =
          'w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] border-2 flex items-center justify-center text-sm font-black transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110';
        el.style.borderColor = color;
        el.innerHTML = `<span style="color: ${color}; font-size: 16px;">📍</span>`;

        new mapboxgl.Marker({ element: el })
          .setLngLat([targetCoords.lng, targetCoords.lat])
          .addTo(map);

        // User Position Marker if available
        if (userCoords) {
          const userEl = document.createElement('div');
          userEl.className = 'relative flex items-center justify-center';
          userEl.innerHTML = `
            <span class="absolute w-6 h-6 rounded-full bg-blue-500/35 animate-ping"></span>
            <span class="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></span>
          `;
          new mapboxgl.Marker({ element: userEl })
            .setLngLat([userCoords.lng, userCoords.lat])
            .addTo(map);

          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([userCoords.lng, userCoords.lat]);
          bounds.extend([targetCoords.lng, targetCoords.lat]);
          map.fitBounds(bounds, { padding: 35, maxZoom: 15.5, duration: 600 });
        }
      } catch (err) {
        console.warn('MiniMap load error:', err);
      }
    });

    const timer = setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 250);

    return () => {
      clearTimeout(timer);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, [targetCoords.lng, targetCoords.lat, userCoords?.lng, userCoords?.lat, color]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-40 shadow-inner select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Walking time badge */}
      <div className="absolute top-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
        <span className="px-3 py-1 rounded-full bg-slate-950/85 text-white text-[11px] font-extrabold backdrop-blur-md shadow-md border border-white/10 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{walkTimeText}</span>
        </span>
      </div>

      {/* Bottom address label */}
      <div className="absolute bottom-2.5 inset-x-2.5 flex justify-center pointer-events-none z-10">
        <span className="px-3 py-1 rounded-full bg-slate-950/85 text-slate-100 text-[10px] font-medium backdrop-blur-md truncate max-w-[310px] border border-white/10 shadow-md">
          {locationName}
        </span>
      </div>
    </div>
  );
};

export const ApplicationDetailView: React.FC<{
  app: ApplicationItem;
  userCoords?: Coordinates | null;
  onBack: () => void;
  onClose: () => void;
  onCancel: () => void;
  onAdvance: (step: number) => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  userRole?: UserRole;
  onUpdate: (app: ApplicationItem) => void;
}> = ({
  app,
  userCoords = null,
  onBack,
  onClose,
  onCancel,
  onAdvance,
  onApprove,
  onReject,
  userRole = 'user',
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [showSosModal, setShowSosModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [customRejectReason, setCustomRejectReason] = useState('Смена уже укомплектована');

  // Dynamic distance & walk time computation
  const defaultMinskCenter: Coordinates = { lng: 27.5615, lat: 53.9045 };
  const targetCoords = app.coordinates || defaultMinskCenter;
  const currentPos = userCoords || defaultMinskCenter;
  const distanceMeters = Math.round(calculateHaversineDistance(currentPos, targetCoords));
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 75));
  const dynamicWalkTime =
    walkingMinutes < 60
      ? `~${walkingMinutes} минут пешком (${formatDistance(distanceMeters)})`
      : `~${Math.round(walkingMinutes / 60)} ч пешком (${formatDistance(distanceMeters)})`;

  // const activeStageConfig = STAGE_GRADIENTS[app.progressStep] || STAGE_GRADIENTS[1];

  const handleSetStep = (step: number) => {
    onAdvance(step);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 relative">
      {/* Top navigation header */}
      <div className="px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-extrabold text-slate-900">Детали отклика</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-xs ${
              app.status === 'active'
                ? 'bg-emerald-600 text-white'
                : app.status === 'pending'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                app.status === 'active' ? 'bg-white' : app.status === 'pending' ? 'bg-slate-950' : 'bg-slate-400'
              }`}
            />
            <span>{app.statusLabel}</span>
          </div>

          <IconButton onClick={onClose} aria-label="Закрыть"><X className="w-4 h-4" /></IconButton>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <ChatInterface
          app={app}
          onBack={() => setActiveTab('details')}
          onUpdate={onUpdate}
          userRole={userRole}
        />
      ) : (
        /* Scrollable Details Content */
        <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-4">
          {/* Admin Decision Card */}
          {isEmployerSide(userRole ?? 'user') && (
            <div className="p-5 rounded-[32px] bg-purple-50/80 border border-purple-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-purple-950">Решение АДМИНА по кандидату</h4>
                  <p className="text-[11px] text-purple-700 font-medium">
                    {app.status === 'pending'
                      ? 'Соискатель ожидает подтверждения смены'
                      : app.status === 'active'
                      ? 'Смена подтверждена и активна'
                      : 'Заявка отклонена'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 text-[10px] font-black uppercase">
                  АДМИН
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onApprove?.()}
                  className="py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Одобрить смену</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Отказать</span>
                </button>
              </div>

              {/* Admin Manual Stage Selector */}
              <div className="pt-2.5 border-t border-purple-200/60 flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-900">Установить стадию (АДМИН):</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSetStep(s)}
                      className={`w-7 h-7 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                        app.progressStep === s
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-200/70 text-purple-900 hover:bg-purple-300'
                      }`}
                      title={STAGE_NAMES[s - 1]}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 shadow-[0_8px_25px_rgba(24,29,56,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.25)] space-y-3.5">
            {/* Title & Action Badges */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-black text-[#181D38] leading-tight">
                {app.role}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowSosModal(true)}
                  className="px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-black text-xs tracking-wide cursor-pointer transition-colors shadow-2xs"
                  title="Экстренная помощь и защита от обмана"
                >
                  SOS
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
                  title="Чат с работодателем"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{app.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-black text-[#181D38]">{app.salary}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{app.scheduleDate}</span>
              </div>
            </div>

            {/* Real Interactive Mapbox Mini Map */}
            <ApplicationMiniMap
              targetCoords={targetCoords}
              userCoords={userCoords}
              walkTimeText={dynamicWalkTime}
              locationName={app.location}
              color={app.color}
            />

            {/* Requirements with checkmarks */}
            {app.requirementsNotes && app.requirementsNotes.length > 0 && (
              <div className="space-y-1 pt-1 text-xs text-slate-600">
                {app.requirementsNotes.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-line font-normal">
              {app.description}
            </p>
          </div>

          {/* Bottom Confirmation Progress Card */}
          <div className="p-5 rounded-[32px] bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 shadow-[0_8px_25px_rgba(24,29,56,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.25)] space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-[#181D38]">
                  {app.status === 'pending'
                    ? 'Отклик ожидает подтверждения'
                    : app.status === 'active'
                    ? 'Отклик подтверждён работодателем'
                    : 'Отклик отменён'}
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400 text-right leading-tight max-w-[150px]">
                Обычно заказчик одобряет отклик в течение 4 часов
              </span>
            </div>

            {/* 5-Step Capsule Progress Tracker matching user reference image */}
            <div className="space-y-3">
              <div className="relative w-full h-8 bg-slate-200/90 rounded-full flex items-center p-1 overflow-hidden">
                {/* Active navy/gradient capsule covering completed steps */}
                <div
                  className="absolute left-1 top-1 bottom-1 rounded-full bg-[#181D38] transition-all duration-300 shadow-sm"
                  style={{
                    width:
                      app.status === 'cancelled'
                        ? '0%'
                        : `${Math.min(100, Math.max(18, (app.progressStep / 5) * 100))}%`,
                  }}
                />

                {/* Step numbers / icons aligned across the track */}
                <div className="relative z-10 w-full flex items-center justify-between px-3 text-xs font-black">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const isPassed = app.progressStep >= s && app.status !== 'cancelled';
                    return (
                      <span
                        key={s}
                        className={`transition-colors flex items-center justify-center w-6 h-6 ${
                          isPassed ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {isPassed ? '✓' : s}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Labels under 5 bars */}
              <div className="grid grid-cols-5 text-center text-[10px] font-extrabold">
                {['Отклик', 'Одобрен', 'Назначен', 'На смене', 'Оплачено'].map((label, idx) => {
                  const s = idx + 1;
                  const isPassed = app.progressStep >= s && app.status !== 'cancelled';
                  return (
                    <span
                      key={label}
                      className={`transition-colors truncate ${
                        isPassed ? 'text-[#181D38] font-black' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Explanatory text */}
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {app.status === 'cancelled'
                ? 'Заявка была отозвана. Вы можете выбрать другую вакансию поблизости.'
                : app.progressStep >= 4
                ? 'Вы успешно приняты на данную смену! Обязательно возьмите паспорт и приходите вовремя.'
                : app.progressStep === 3
                ? 'Работодатель назначил вас на смену. Ждем вас на локации!'
                : app.progressStep === 2
                ? 'Отклик одобрен работодателем. Скоро смена будет подтверждена.'
                : 'Отклик отправлен. Ожидайте рассмотрения работодателем.'}
            </p>

            {/* Action Buttons: Отказаться / Возобновить + Перейти в чат */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {app.status === 'cancelled' ? (
                <button
                  onClick={() => handleSetStep(1)}
                  className="py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Возобновить</span>
                </button>
              ) : (
                <button
                  onClick={onCancel}
                  className="py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Отказаться</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('chat')}
                className="py-3 px-4 rounded-full bg-[#181D38] hover:bg-[#252C54] active:scale-98 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Перейти в чат</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSosModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-red-200 w-full max-w-[350px] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Экстренная защита</h3>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Поддержка Halty 24/7</p>
                </div>
              </div>
              <button
                onClick={() => setShowSosModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50/90 rounded-2xl border border-red-100 text-xs text-red-950 leading-relaxed font-medium">
              Если работодатель <strong>обманывает, меняет условия или задерживает расчёт</strong> — пишите сразу в чат куратору! Мы моментально реагируем, блокируем недобросовестных работодателей и компенсируем смену соискателю.
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowSosModal(false);
                  setActiveTab('chat');
                }}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Написать куратору смены (24/7)</span>
              </button>

              <a
                href="tel:+375172008090"
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Phone className="w-4 h-4 text-slate-600" />
                <span>Горячая линия защиты: +375 (17) 200-80-90</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal for Admin */}
      {showRejectModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-rose-200 w-full max-w-[340px] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900">Причина отказа</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Укажите причину отказа для соискателя. Уведомление появится в его статусе и чате:
            </p>

            <div className="space-y-1.5">
              {[
                'Смена уже укомплектована',
                'Не подходит график / время',
                'Требуется опыт на аналогичном объекте',
                'Необходима дополнительная медсправка',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCustomRejectReason(reason)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    customRejectReason === reason
                      ? 'bg-rose-50 border border-rose-300 text-rose-800'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
              placeholder="Своя причина отказа…"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-400"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  onReject?.(customRejectReason);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                Подтвердить отказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   4. CHAT INTERFACE
═══════════════════════════════════════════════════════════════════ */
const ChatInterface: React.FC<{
  app: ApplicationItem;
  onBack: () => void;
  onUpdate: (app: ApplicationItem) => void;
  userRole?: UserRole;
}> = ({ app, onBack, userRole = 'user' }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [app.messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sender = isEmployerSide(userRole ?? 'user') ? 'employer' : 'user';
    dbStore.sendChatMessage(app.id, trimmed, sender);
    setText('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900">
      {/* Subheader */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">
              {isEmployerSide(userRole ?? 'user') ? 'Соискатель: Егор Макаров' : app.company}
            </span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
              {isEmployerSide(userRole ?? 'user') ? 'КАНДИДАТ' : 'АДМИН'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            В сети
          </span>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          К деталям
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-2.5">
        {app.messages.map((msg) => {
          const isMe = (isEmployerSide(userRole ?? 'user') && msg.from === 'employer') || (userRole === 'user' && msg.from === 'user');
          return msg.isSystem ? (
            <div key={msg.id} className="flex justify-center my-1">
              <span className="text-[10px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium text-center">
                {msg.text} · {msg.time}
              </span>
            </div>
          ) : (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                  isMe
                    ? 'bg-slate-900 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`text-[9px] mt-1 text-right ${
                    isMe ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
          <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder={
              isEmployerSide(userRole ?? 'user')
                ? 'Написать соискателю от лица АДМИНА…'
                : 'Написать работодателю (АДМИНУ)…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              text.trim() ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   4b. CHATS LIST VIEW (Conversations with employers)
═══════════════════════════════════════════════════════════════════ */
const ChatsListView: React.FC<{
  applications: ApplicationItem[];
  vacancies: Vacancy[];
  onClose: () => void;
  onUpdate: (app: ApplicationItem) => void;
  onSelectVacancy: (vacancy: Vacancy) => void;
  userRole?: UserRole;
}> = ({ applications, vacancies, onClose, onUpdate, onSelectVacancy, userRole = 'user' }) => {
  const [selectedChatAppId, setSelectedChatAppId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const activeApp = applications.find((a) => a.id === selectedChatAppId);

  if (activeApp) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900">
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedChatAppId(null)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">{activeApp.company}</h2>
              <p className="text-[10px] text-slate-500 truncate">{activeApp.role}</p>
            </div>
          </div>
          <IconButton onClick={onClose} aria-label="Закрыть">
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <ChatInterface
          app={activeApp}
          onBack={() => {
            const vacancy =
              findVacancyForApplication(activeApp, vacancies) ?? applicationToVacancyFallback(activeApp);
            onSelectVacancy(vacancy);
          }}
          onUpdate={onUpdate}
          userRole={userRole}
        />
      </div>
    );
  }

  const filteredApps = applications.filter(
    (a) =>
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">Сообщения</h2>
            <p className="text-xs text-slate-500 mt-0.5">Диалоги с работодателями по смене</p>
          </div>
        </div>
        <IconButton onClick={onClose} aria-label="Закрыть">
          <X className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-600 px-3.5 py-2.5 rounded-2xl shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Поиск по диалогам…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Dialog list */}
      <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-2.5">
        {filteredApps.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Нет активных диалогов</p>
            <p className="text-xs text-slate-400 mt-1">Откликнитесь на вакансию, чтобы начать чат</p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const lastMsg = app.messages[app.messages.length - 1];
            return (
              <button
                key={app.id}
                onClick={() => setSelectedChatAppId(app.id)}
                className="w-full text-left group flex items-start gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs relative"
                  style={{ backgroundColor: app.color }}
                >
                  {app.company.slice(0, 2).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {app.company}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {lastMsg ? lastMsg.time : app.appliedDate}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{app.role}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1 bg-slate-50 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                    {lastMsg ? lastMsg.text : 'Чат готов к диалогу'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   5. FAVORITES CONTENT
═══════════════════════════════════════════════════════════════════ */
const FavoritesContent: React.FC<{
  vacancies: Vacancy[];
  onSelectVacancy: (v: Vacancy) => void;
  onClose: () => void;
}> = ({ vacancies, onSelectVacancy, onClose }) => {
  const [favIds, setFavIds] = useState<string[]>(() => dbStore.getFavorites());

  useEffect(() => {
    return dbStore.subscribe(() => {
      setFavIds(dbStore.getFavorites());
    });
  }, []);

  const favSet = new Set(favIds);
  const favs = vacancies.filter((v) => favSet.has(v.id));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Избранное</h2>
            <p className="text-xs text-slate-500 mt-0.5">{favs.length} сохранённых вакансий</p>
          </div>
        </div>
        <IconButton onClick={onClose} aria-label="Закрыть"><X className="w-4 h-4" /></IconButton>
      </div>

      <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-2.5">
        {favs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Heart className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-400" />
            <p className="text-sm font-semibold text-slate-600">В избранном пока пусто</p>
            <p className="text-xs text-slate-400 mt-1">
              Нажмите на сердечко в карточке любой вакансии, чтобы сохранить её
            </p>
          </div>
        ) : (
          favs.map((vac) => (
            <button
              key={vac.id}
              onClick={() => {
                onSelectVacancy(vac);
                onClose();
              }}
              className="w-full text-left group flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm transition-all cursor-pointer"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                style={{ background: vac.color + '18', border: `1.5px solid ${vac.color}40` }}
              >
                <Heart className="w-5 h-5 fill-current" style={{ color: vac.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {vac.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">{vac.salary} · {vac.company}</p>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">АДМИН</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-all shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   6. PROFILE CONTENT (Ты)
═══════════════════════════════════════════════════════════════════ */
const ProfileContent: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex flex-col h-full bg-white dark:bg-slate-900">
    <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Мой профиль</h2>
          <p className="text-xs text-slate-500 mt-0.5">Соискатель верифицирован</p>
        </div>
      </div>
      <IconButton onClick={onClose} aria-label="Закрыть"><X className="w-4 h-4" /></IconButton>
    </div>

    <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-4">
      {/* User Card */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white flex items-center gap-4 shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">
          ЯМ
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold truncate">Егор Макаров</h3>
            <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400 shrink-0" />
          </div>
          <p className="text-xs text-slate-300 mt-0.5">+375 (29) 123-45-67</p>
          <p className="text-[11px] text-slate-400">г. Минск</p>
        </div>
      </div>

      {/* Action Buttons */}
      <button className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer">
        Редактировать анкету
      </button>
    </div>
  </div>
);
