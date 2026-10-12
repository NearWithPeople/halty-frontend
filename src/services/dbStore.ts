import type { Vacancy, UserAccount, UserRole, Coordinates, VacancyCategory } from '../types';
import { isEmployerSide } from '../utils/roles';
import { MINSK_VACANCIES } from '../data/minskVacancies';
import { INITIAL_APPLICATIONS } from '../data/initialApplications';
import type { ApplicationItem, ChatMessage } from '../models/application';
import { apiClient } from './apiClient';

/* ─── Default Pre-configured Accounts ───────────────────────────── */
export const DEFAULT_ACCOUNTS: Record<UserRole, UserAccount> = {
  user: {
    id: 'user-egor',
    name: 'Егор Макаров',
    email: 'egor.makarov@gmail.com',
    phone: '+375 (29) 123-45-67',
    role: 'user',
    avatar: 'ЕМ',
    rating: 4.9,
    completedShifts: 14,
    punctuality: '100%',
    tgUsername: 'egormakarov',
    tgConnected: true,
  },
  employer: {
    id: 'employer-irina',
    name: 'Ирина Савчук',
    email: 'employer@halty.by',
    phone: '+375 (44) 120-33-77',
    role: 'employer',
    avatar: 'ИС',
    companyName: 'Логистик-Групп Минск',
    rating: 4.9,
    completedShifts: 0,
    punctuality: '—',
    tgUsername: 'irina_hr_logistic',
    tgConnected: true,
  },
  admin: {
    id: 'admin-halty',
    name: 'Администратор Halty',
    email: 'admin@halty.by',
    phone: '+375 (17) 200-80-90',
    role: 'admin',
    avatar: 'АД',
    companyName: 'Администрация сервиса (Работодатель)',
    rating: 5.0,
    completedShifts: 142,
    punctuality: '100%',
    tgUsername: 'halty_admin',
    tgConnected: true,
  },
};

const STORAGE_KEYS = {
  USER: 'halty_current_user',
  IS_AUTH: 'halty_is_authenticated',
  VACANCIES: 'halty_vacancies_db',
  APPLICATIONS: 'halty_applications_db',
  FAVORITES: 'halty_favorites_db',
};

type Listener = () => void;
type LiveVacancyListener = (vacancy: Vacancy) => void;

class DatabaseStore {
  private listeners: Set<Listener> = new Set();
  private liveVacancyListeners: Set<LiveVacancyListener> = new Set();
  private currentUser: UserAccount;
  private isAuth: boolean;
  private vacancies: Vacancy[] = [];
  private applications: ApplicationItem[] = [];
  private favorites: Set<string> = new Set();
  private hasSyncedVacancies = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 1. Load User & Auth from LocalStorage
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTH);

    const savedSession = savedAuth !== null ? JSON.parse(savedAuth) === true : false;
    this.isAuth = savedSession && apiClient.hasToken();
    this.currentUser = savedUser ? JSON.parse(savedUser) : DEFAULT_ACCOUNTS.user;

    // 2. Load Vacancies from LocalStorage or seed
    const savedVacancies = localStorage.getItem(STORAGE_KEYS.VACANCIES);
    if (savedVacancies) {
      try {
        this.vacancies = JSON.parse(savedVacancies);
      } catch {
        this.vacancies = this.seedVacancies();
      }
    } else {
      this.vacancies = this.seedVacancies();
    }

    // 3. Load Applications
    const savedApps = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (savedApps) {
      try {
        this.applications = JSON.parse(savedApps);
      } catch {
        this.applications = INITIAL_APPLICATIONS;
      }
    } else {
      this.applications = INITIAL_APPLICATIONS;
    }

    // 4. Load Favorites
    const savedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (savedFavs) {
      try {
        this.favorites = new Set(JSON.parse(savedFavs));
      } catch {
        this.favorites = new Set(['vac-1', 'vac-2']);
      }
    } else {
      this.favorites = new Set(['vac-1', 'vac-2']);
    }

    this.persist();

    // 5. Realtime listeners + optional sync (Node server on :3001)
    this.setupRealtimeListeners();
    this.startApiSync();
  }

  private seedVacancies(): Vacancy[] {
    return MINSK_VACANCIES.map((v) => ({
      ...v,
      employerName: 'АДМИН', // "в графе работодатель пишется АДМИН чтобы было понятно"
      createdByRole: 'admin' as const,
    }));
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, JSON.stringify(this.isAuth));
      localStorage.setItem(STORAGE_KEYS.VACANCIES, JSON.stringify(this.vacancies));
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(this.applications));
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(this.favorites)));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeLiveVacancy(listener: LiveVacancyListener): () => void {
    this.liveVacancyListeners.add(listener);
    return () => this.liveVacancyListeners.delete(listener);
  }

  private isPublicVacancy(vacancy?: Vacancy): boolean {
    if (!vacancy) return false;
    return (vacancy.moderationStatus ?? 'published') === 'published';
  }

  private upsertLiveVacancy(vacancy: Vacancy) {
    const prev = this.vacancies.find((item) => item.id === vacancy.id);
    const justPublished = this.hasSyncedVacancies && this.isPublicVacancy(vacancy) && !this.isPublicVacancy(prev);
    this.vacancies = prev
      ? this.vacancies.map((item) => (item.id === vacancy.id ? vacancy : item))
      : [vacancy, ...this.vacancies];
    this.persist();
    if (justPublished && vacancy.createdByUserId !== this.currentUser.id) {
      this.liveVacancyListeners.forEach((listener) => listener(vacancy));
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  /* ─── Realtime WebSocket Listeners ─────────────────────────────── */
  private setupRealtimeListeners() {
    // Vacancy created by admin
    apiClient.on('VACANCY_CREATED', (newVac: Vacancy) => {
      this.upsertLiveVacancy(newVac);
    });

    // Vacancy deleted
    apiClient.on('VACANCY_DELETED', ({ id }: { id: string }) => {
      this.vacancies = this.vacancies.filter((v) => v.id !== id);
      this.persist();
    });

    apiClient.on('VACANCY_UPDATED', (vacancy: Vacancy) => {
      this.upsertLiveVacancy(vacancy);
    });

    // Application created
    apiClient.on('APPLICATION_CREATED', (app: ApplicationItem) => {
      const idx = this.applications.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        this.applications[idx] = app;
      } else {
        this.applications = [app, ...this.applications];
      }
      this.persist();
    });

    // Application updated (e.g. status changed, stage advanced)
    apiClient.on('APPLICATION_UPDATED', (app: ApplicationItem) => {
      this.applications = this.applications.map((a) => (a.id === app.id ? app : a));
      this.persist();
    });

    // New chat message arrived in realtime
    apiClient.on('NEW_CHAT_MESSAGE', ({ applicationId, message }: { applicationId: string; message: any }) => {
      this.applications = this.applications.map((a) => {
        if (a.id === applicationId) {
          const exists = a.messages.some((m) => m.id === message.id);
          if (!exists) {
            const chatMsg: ChatMessage = {
              id: message.id,
              text: message.text,
              from: message.sender === 'user' ? 'user' : 'employer',
              time: message.timestamp || new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
            };
            return {
              ...a,
              messages: [...a.messages, chatMsg],
            };
          }
        }
        return a;
      });
      this.persist();
    });

    // User profile updated
    apiClient.on('USER_UPDATED', (user: UserAccount) => {
      if (this.currentUser.id === user.id) {
        this.currentUser = { ...this.currentUser, ...user };
        this.persist();
      }
    });
  }

  /* ─── Backend Synchronization ──────────────────────────────────── */
  private startApiSync() {
    void this.syncWithBackend();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      void this.syncWithBackend();
    }, 4000);
  }

  private mergeApplications(incoming: ApplicationItem[]) {
    const localById = new Map(this.applications.map((app) => [app.id, app]));
    const merged = incoming.map((app) => {
      const local = localById.get(app.id);
      if (!local) return app;
      const ids = new Set(app.messages.map((message) => message.id));
      const extra = local.messages.filter((message) => message.id.startsWith('msg-') && !ids.has(message.id));
      return extra.length > 0 ? { ...app, messages: [...app.messages, ...extra] } : app;
    });
    const incomingIds = new Set(merged.map((app) => app.id));
    const pendingLocal = this.applications.filter(
      (app) => app.id.startsWith('app::') && !incomingIds.has(app.id) && !incoming.some((item) => item.vacancyId && app.vacancyId === item.vacancyId)
    );
    this.applications = [...merged, ...pendingLocal];
  }

  private async syncWithBackend() {
    try {
      const liveVacancies = await apiClient.getVacancies();
      if (liveVacancies) {
        for (const vacancy of liveVacancies) this.upsertLiveVacancy(vacancy);
        const ids = new Set(liveVacancies.map((vacancy) => vacancy.id));
        this.vacancies = this.vacancies.filter((vacancy) => ids.has(vacancy.id) || vacancy.id.startsWith('vac-custom-'));
        this.hasSyncedVacancies = true;
      }

      if (this.isAuth && apiClient.hasToken()) {
        const liveApps = await apiClient.getApplications();
        if (liveApps) this.mergeApplications(liveApps);
      }

      this.persist();
    } catch (e) {
      console.warn('[Halty Sync] Backend sync error, using cached data:', e);
    }
  }

  /* ─── Auth & Roles ────────────────────────────────────────────── */
  public getCurrentUser(): UserAccount {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.isAuth;
  }

  private enterSession(user: UserAccount) {
    this.currentUser = user;
    this.isAuth = true;
    this.persist();
    void this.syncWithBackend();
  }

  public async loginWithPassword(email: string, password: string): Promise<UserAccount | null> {
    const user = await apiClient.login(email, password);
    if (!user) return null;
    this.enterSession(user);
    return user;
  }

  public async registerAccount(payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: 'user' | 'employer';
    companyName?: string;
  }): Promise<{ user: UserAccount | null; error?: string }> {
    const result = await apiClient.register(payload);
    if (result.user) this.enterSession(result.user);
    return result;
  }

  public login(role: UserRole = 'user') {
    this.currentUser = DEFAULT_ACCOUNTS[role];
    this.isAuth = true;
    this.persist();
  }

  public switchRole(role: UserRole) {
    this.currentUser = DEFAULT_ACCOUNTS[role];
    this.persist();
  }

  public updateProfile(updated: Partial<UserAccount>) {
    this.currentUser = { ...this.currentUser, ...updated };
    this.persist();
    // Sync with backend SQLite
    apiClient.updateProfile({ id: this.currentUser.id, ...updated });
  }

  public logout() {
    this.isAuth = false;
    apiClient.setToken(null);
    apiClient.disconnectWebSocket();
    void this.syncWithBackend();
    this.persist();
  }

  /* ─── Vacancies ────────────────────────────────────────────────── */
  public getVacancies(): Vacancy[] {
    return this.vacancies;
  }

  public addVacancy(data: {
    title: string;
    company: string;
    salary: string;
    category: VacancyCategory;
    categoryLabel: string;
    coordinates: Coordinates;
    locationName: string;
    address?: string;
    description: string;
    requirements: string[];
    schedule: string;
    payoutType: string;
    color?: string;
    accentColor?: string;
    attachmentType?: 'building' | 'ground_zone';
    iconType?: 'tree' | 'coffee' | 'shopping' | 'delivery' | 'laptop' | 'wrench';
  }): Vacancy {
    const categoryColors: Record<VacancyCategory, { color: string; accent: string; icon: any }> = {
      horeca: { color: '#f59e0b', accent: '#78350f', icon: 'coffee' },
      parks_green: { color: '#10b981', accent: '#064e3b', icon: 'tree' },
      retail: { color: '#3b82f6', accent: '#1e3a8a', icon: 'shopping' },
      delivery: { color: '#8b5cf6', accent: '#4c1d95', icon: 'delivery' },
      it_creative: { color: '#ec4899', accent: '#831843', icon: 'laptop' },
      service: { color: '#06b6d4', accent: '#164e63', icon: 'wrench' },
    };

    const cfg = categoryColors[data.category] || categoryColors.service;

    const newVac: Vacancy = {
      id: `vac-custom-${Date.now()}`,
      title: data.title,
      company: data.company,
      employerName:
        this.currentUser.role === 'admin'
          ? 'АДМИН'
          : this.currentUser.companyName || this.currentUser.name,
      salary: data.salary,
      category: data.category,
      categoryLabel: data.categoryLabel,
      attachmentType: data.attachmentType || 'building',
      coordinates: data.coordinates,
      locationName: data.locationName,
      address: data.address || data.locationName,
      description: data.description,
      requirements: data.requirements,
      schedule: data.schedule,
      payoutType: data.payoutType,
      color: data.color || cfg.color,
      accentColor: data.accentColor || cfg.accent,
      iconType: data.iconType || cfg.icon,
      createdAt: Date.now(),
      createdByRole: this.currentUser.role === 'employer' ? 'employer' : 'admin',
      createdByUserId: this.currentUser.id,
      moderationStatus: this.currentUser.role === 'admin' ? 'published' : 'pending',
    };

    // Optimistic update
    this.vacancies = [newVac, ...this.vacancies];
    this.persist();

    // Persist to live backend SQLite
    void apiClient.createVacancy(newVac).then((saved) => {
      if (!saved) return;
      this.vacancies = this.vacancies.map((v) => (v.id === newVac.id || v.id === saved.id ? saved : v));
      if (!this.vacancies.some((v) => v.id === saved.id)) {
        this.vacancies = [saved, ...this.vacancies];
      }
      this.persist();
    });

    return newVac;
  }

  public moderateVacancy(id: string, status: 'published' | 'rejected') {
    this.vacancies = this.vacancies.map((v) => (v.id === id ? { ...v, moderationStatus: status } : v));
    this.persist();
    void apiClient.moderateVacancy(id, status);
  }

  public canDeleteVacancy(vacancy: Vacancy): boolean {
    if (!isEmployerSide(this.currentUser.role)) return false;
    if (vacancy.createdByUserId) {
      return vacancy.createdByUserId === this.currentUser.id;
    }
    if (!vacancy.id.startsWith('vac-custom-')) return false;

    // Старые смены в localStorage без createdByUserId
    if (this.currentUser.role === 'admin') {
      return vacancy.createdByRole !== 'employer';
    }
    if (this.currentUser.role === 'employer') {
      const org = this.currentUser.companyName || this.currentUser.name;
      return vacancy.createdByRole === 'employer' && vacancy.company === org;
    }
    return false;
  }

  public deleteOwnVacancy(id: string): { ok: true } | { ok: false; reason: 'not_found' | 'forbidden' } {
    const vacancy = this.vacancies.find((v) => v.id === id);
    if (!vacancy) return { ok: false, reason: 'not_found' };
    if (!this.canDeleteVacancy(vacancy)) return { ok: false, reason: 'forbidden' };

    this.vacancies = this.vacancies.filter((v) => v.id !== id);
    this.favorites.delete(id);
    this.applications = this.applications.filter((a) => a.id !== `app-vac-${id}`);
    this.persist();
    apiClient.deleteVacancy(id);
    return { ok: true };
  }

  /* ─── Applications ─────────────────────────────────────────────── */
  public getApplications(): ApplicationItem[] {
    return this.applications;
  }

  public async applyToVacancy(vacancy: Vacancy, applicant: UserAccount = this.currentUser): Promise<ApplicationItem> {
    const existing = this.applications.find(
      (a) => a.id === `app::${applicant.id}::${vacancy.id}`
    );
    if (existing) return existing;

    const newApp: ApplicationItem = {
      id: `app::${applicant.id}::${vacancy.id}`,
      vacancyId: vacancy.id,
      role: vacancy.title,
      company: `${vacancy.company} (АДМИН)`,
      status: 'pending',
      statusLabel: 'Ожидает',
      location: vacancy.locationName,
      salary: vacancy.salary,
      scheduleDate: 'с 09:00 по 18:00 сегодня',
      duration: '4-8 часов',
      walkTime: '~10 минут пешком',
      requirementsNotes: vacancy.requirements || ['Паспорт гражданина / ВНЖ', 'Опрятный вид', 'Пунктуальность'],
      description: vacancy.description,
      appliedDate: 'Сегодня',
      color: vacancy.color,
      progressStep: 1,
      coordinates: vacancy.coordinates,
      messages: [
        {
          id: `sys-${Date.now()}`,
          text: `Отклик от соискателя ${applicant.name} успешно зарегистрирован. Заявку рассматривает АДМИНИСТРАТОР (Работодатель).`,
          from: 'employer',
          time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
        },
      ],
    };

    // Optimistic update
    this.applications = [newApp, ...this.applications];
    this.persist();

    const saved = await apiClient.createApplication(vacancy);
    if (saved) {
      this.applications = this.applications.map((app) => (app.id === newApp.id ? { ...saved, vacancyId: saved.vacancyId ?? vacancy.id } : app));
      this.persist();
      return this.applications.find((app) => app.id === saved.id) ?? saved;
    }

    return newApp;
  }

  public advanceStage(id: string, step: number) {
    const stageNames = ['Отправлен', 'Доставлен', 'Просмотрен', 'Подтверждён', 'Смена'];
    this.applications = this.applications.map((a) => {
      if (a.id === id) {
        const clamped = Math.max(1, Math.min(5, step));
        const isConfirmed = clamped >= 4;
        return {
          ...a,
          progressStep: clamped,
          status: isConfirmed ? 'active' : a.status === 'cancelled' ? 'cancelled' : 'pending',
          statusLabel: isConfirmed ? 'Активен' : a.status === 'cancelled' ? 'Отменён' : 'Ожидает',
          messages: [
            ...a.messages,
            {
              id: `sys-${Date.now()}`,
              text: `Стадия обновлена АДМИНОМ: «${stageNames[clamped - 1]}»`,
              from: 'employer',
              time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            },
          ],
        };
      }
      return a;
    });
    this.persist();

    // Sync to backend
    apiClient.updateApplicationStatus(id, { step });
  }

  public approveApplication(id: string) {
    this.applications = this.applications.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          status: 'active',
          statusLabel: 'Одобрено (Смена)',
          progressStep: 4,
          messages: [
            ...a.messages,
            {
              id: `msg-${Date.now()}`,
              text: `Поздравляем! Ваш отклик одобрен АДМИНОМ. Вы приглашены на смену. Приходите по адресу ${a.location}.`,
              from: 'employer',
              time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
      }
      return a;
    });
    this.persist();

    // Sync to backend SQLite & dispatch Telegram notification
    apiClient.updateApplicationStatus(id, { status: 'active', step: 4 });
  }

  public rejectApplication(id: string, reason = 'Смена укомплектована') {
    this.applications = this.applications.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          status: 'cancelled',
          statusLabel: 'Отказ',
          messages: [
            ...a.messages,
            {
              id: `msg-${Date.now()}`,
              text: `АДМИНИСТРАТОР отклонил заявку. Причина: ${reason}. Вы можете откликнуться на другие вакансии поблизости.`,
              from: 'employer',
              time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            },
          ],
        };
      }
      return a;
    });
    this.persist();

    // Sync to backend SQLite & dispatch Telegram notification
    apiClient.updateApplicationStatus(id, { status: 'rejected', rejectionReason: reason });
  }

  public cancelApplication(id: string) {
    let targetStatus = 'cancelled';
    this.applications = this.applications.map((a) => {
      if (a.id === id) {
        const isCancelled = a.status === 'cancelled';
        targetStatus = isCancelled ? 'pending' : 'cancelled';
        return {
          ...a,
          status: isCancelled ? 'pending' : 'cancelled',
          statusLabel: isCancelled ? 'Ожидает' : 'Отменён',
          progressStep: isCancelled ? 1 : a.progressStep,
          messages: [
            ...a.messages,
            {
              id: `sys-${Date.now()}`,
              text: isCancelled ? 'Отклик успешно возобновлен соискателем' : 'Отклик отозван соискателем',
              from: 'user',
              time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            },
          ],
        };
      }
      return a;
    });
    this.persist();

    // Sync to backend
    apiClient.updateApplicationStatus(id, { status: targetStatus });
  }

  public updateApplication(app: ApplicationItem) {
    this.applications = this.applications.map((a) => (a.id === app.id ? app : a));
    this.persist();
  }

  public sendChatMessage(appId: string, text: string, from: 'user' | 'employer') {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      from,
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
    };

    this.applications = this.applications.map((a) => {
      if (a.id === appId) {
        return {
          ...a,
          messages: [...a.messages, newMsg],
        };
      }
      return a;
    });
    this.persist();

    // Send to backend SQLite & trigger Telegram notification
    const senderRole = this.currentUser.role === 'user' ? 'user' : this.currentUser.role === 'employer' ? 'employer' : 'admin';
    apiClient.sendChatMessage(appId, trimmed, senderRole, this.currentUser.name, newMsg.id);
  }

  /* ─── Telegram Methods ─────────────────────────────────────────── */
  public async connectTelegram(username: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.connectTelegram(this.currentUser.id, username);
    this.updateProfile({ tgUsername: username.replace(/^@/, ''), tgConnected: true });
    return res;
  }

  public async sendTestTelegramPush(role: UserRole = 'user'): Promise<any> {
    const apiRole = role === 'user' ? 'user' : 'admin';
    return await apiClient.sendTestTelegramNotification(apiRole);
  }

  /* ─── Favorites ────────────────────────────────────────────────── */
  public getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  public isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  public toggleFavorite(id: string): boolean {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
    this.persist();
    return this.favorites.has(id);
  }
}

export const dbStore = new DatabaseStore();
