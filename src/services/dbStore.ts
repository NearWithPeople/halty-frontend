import type { Vacancy, UserAccount, UserRole, Coordinates, VacancyCategory } from '../types';
import { isEmployerSide } from '../utils/roles';
import { MOCK_ACCOUNTS, MOCK_APPLICATIONS, MOCK_VACANCIES, type MockAccount } from '../mock/mockData';
import type { ApplicationItem, ChatMessage } from '../models/application';

function withoutPassword(account: MockAccount): UserAccount {
  const { password, ...user } = account;
  void password;
  return user;
}

export const DEFAULT_ACCOUNTS: Record<UserRole, UserAccount> = {
  user: withoutPassword(MOCK_ACCOUNTS.user),
  employer: withoutPassword(MOCK_ACCOUNTS.employer),
  admin: withoutPassword(MOCK_ACCOUNTS.admin),
};

const STORAGE_KEYS = {
  USER: 'halty_mock_user',
  IS_AUTH: 'halty_mock_auth',
  VACANCIES: 'halty_mock_vacancies',
  APPLICATIONS: 'halty_mock_applications',
  FAVORITES: 'halty_mock_favorites',
  REGISTERED: 'halty_mock_registered',
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

  constructor() {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTH);

    const savedSession = savedAuth !== null ? JSON.parse(savedAuth) === true : false;
    this.isAuth = savedSession;
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
        this.applications = MOCK_APPLICATIONS;
      }
    } else {
      this.applications = MOCK_APPLICATIONS;
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

    this.hasSyncedVacancies = true;
    this.persist();
  }

  private seedVacancies(): Vacancy[] {
    return MOCK_VACANCIES.map((v) => ({
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

  private loadRegistered(): MockAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveRegistered(users: MockAccount[]) {
    localStorage.setItem(STORAGE_KEYS.REGISTERED, JSON.stringify(users));
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
  }

  public async loginWithPassword(email: string, password: string): Promise<UserAccount | null> {
    const normalized = email.trim().toLowerCase();
    const known = [...Object.values(MOCK_ACCOUNTS), ...this.loadRegistered()];
    const match = known.find((account) => account.email.toLowerCase() === normalized && account.password === password);
    if (!match) return null;
    const user = withoutPassword(match);
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
    const email = payload.email.trim().toLowerCase();
    const known = [...Object.values(MOCK_ACCOUNTS), ...this.loadRegistered()];
    if (known.some((account) => account.email.toLowerCase() === email)) {
      return { user: null, error: 'Такой email уже зарегистрирован' };
    }
    if (payload.role === 'employer' && !payload.companyName?.trim()) {
      return { user: null, error: 'Укажите название компании' };
    }
    const account: MockAccount = {
      id: `local-${Date.now()}`,
      name: payload.name.trim(),
      email,
      password: payload.password,
      phone: payload.phone.trim(),
      role: payload.role,
      avatar: payload.name.replace(/\s+/g, '').slice(0, 2).toUpperCase() || 'ХЛ',
      companyName: payload.companyName?.trim(),
      rating: 5,
      completedShifts: 0,
      punctuality: '100%',
    };
    this.saveRegistered([...this.loadRegistered(), account]);
    const user = withoutPassword(account);
    this.enterSession(user);
    return { user };
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
  }

  public logout() {
    this.isAuth = false;
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

    this.vacancies = [newVac, ...this.vacancies];
    this.persist();
    return newVac;
  }

  public moderateVacancy(id: string, status: 'published' | 'rejected') {
    const current = this.vacancies.find((vacancy) => vacancy.id === id);
    if (!current) return;
    this.upsertLiveVacancy({ ...current, moderationStatus: status });
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
  }

  public cancelApplication(id: string) {
    this.applications = this.applications.map((a) => {
      if (a.id === id) {
        const isCancelled = a.status === 'cancelled';
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
  }

  /* ─── Telegram Methods ─────────────────────────────────────────── */
  public async connectTelegram(username: string): Promise<{ success: boolean; message: string }> {
    const clean = username.replace(/^@/, '');
    this.updateProfile({ tgUsername: clean, tgConnected: true });
    return { success: true, message: `Telegram @${clean} сохранён локально` };
  }

  public async sendTestTelegramPush(_role: UserRole = 'user'): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Мок: уведомление показано только в интерфейсе' };
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
