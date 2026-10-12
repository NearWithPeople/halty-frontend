/**
 * Frontend API client. All requests go to the Strapi REST API.
 */

import type { Vacancy, UserAccount } from '../types';
import type { ApplicationItem, ChatMessage } from '../models/application';
import { backendConfig, resolveWebSocketUrl } from '../config/backend';
import { strapiClient } from './strapiClient';

const TOKEN_KEY = 'halty_api_token';

export type RealtimeEventType =
  | 'CONNECTED'
  | 'VACANCY_CREATED'
  | 'VACANCY_UPDATED'
  | 'VACANCY_DELETED'
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'NEW_CHAT_MESSAGE'
  | 'USER_UPDATED'
  | 'TELEGRAM_NOTIFICATION_DISPATCHED';

export type RealtimeEventHandler = (payload: any) => void;

class ApiClient {
  private token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private wsConnectRequested = false;

  public hasToken(): boolean {
    return Boolean(this.token);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (token) strapiClient.setToken(token);
    else strapiClient.clearToken();
  }

  /* ─── WebSocket Connection ───────────────────────────────────────── */
  public connectWebSocket() {
    if (!backendConfig.enableNodeWs || typeof window === 'undefined') return;
    this.wsConnectRequested = true;
    this.initWebSocket();
  }

  public disconnectWebSocket() {
    this.wsConnectRequested = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private initWebSocket() {
    if (!backendConfig.enableNodeWs || !this.wsConnectRequested || typeof window === 'undefined') {
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = resolveWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('⚡ [Halty WS] Connected to live backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          this.emit(type, payload);
        } catch (e) {
          console.warn('[Halty WS] Failed to parse message', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.wsConnectRequested) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      console.warn('[Halty WS] Init error, scheduling retry', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.wsConnectRequested || !backendConfig.enableNodeWs || this.reconnectTimeout) return;
    const delay = Math.min(3000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts += 1;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.initWebSocket();
    }, delay);
  }

  public on(event: RealtimeEventType, handler: RealtimeEventHandler): () => void {
    if (!this.wsListeners.has(event)) {
      this.wsListeners.set(event, new Set());
    }
    this.wsListeners.get(event)!.add(handler);
    return () => {
      this.wsListeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, payload: any) {
    const handlers = this.wsListeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.error('[Halty WS] Handler error:', e);
        }
      });
    }
  }

  /* ─── REST: Vacancies ────────────────────────────────────────────── */
  public async getVacancies(params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    category?: string;
    search?: string;
  }): Promise<Vacancy[] | null> {
    return strapiClient.getVacancies(params);
  }

  public async createVacancy(vacancyData: Partial<Vacancy>): Promise<Vacancy | null> {
    return strapiClient.createVacancy(vacancyData);
  }

  public async deleteVacancy(id: string): Promise<boolean> {
    return strapiClient.deleteVacancy(id);
  }

  /* ─── REST: Applications ─────────────────────────────────────────── */
  public async getApplications(): Promise<ApplicationItem[] | null> {
    return strapiClient.getApplications();
  }

  public async createApplication(vacancy: Vacancy): Promise<ApplicationItem | null> {
    return strapiClient.createApplication(vacancy);
  }

  public async updateApplicationStatus(
    id: string,
    update: { status?: string; step?: number; rejectionReason?: string }
  ): Promise<ApplicationItem | null> {
    return strapiClient.updateApplicationStatus(id, update);
  }

  public async moderateVacancy(id: string, status: 'published' | 'rejected'): Promise<Vacancy | null> {
    return strapiClient.moderateVacancy(id, status);
  }

  public async sendChatMessage(
    applicationId: string,
    text: string,
    senderRole: 'user' | 'admin' | 'employer',
    senderName?: string,
    messageId?: string
  ): Promise<ChatMessage | null> {
    return strapiClient.sendChatMessage(applicationId, text, senderRole, senderName, messageId);
  }

  /* ─── REST: Auth & Profile ───────────────────────────────────────── */
  public async login(email: string, password: string): Promise<UserAccount | null> {
    const user = await strapiClient.login(email, password);
    if (user && strapiClient.hasToken()) this.token = localStorage.getItem(TOKEN_KEY);
    if (typeof localStorage !== 'undefined') {
      const jwt = localStorage.getItem('halty_strapi_jwt');
      if (jwt) this.setToken(jwt);
    }
    return user;
  }

  public async register(payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: 'user' | 'employer';
    companyName?: string;
  }): Promise<{ user: UserAccount | null; error?: string }> {
    const result = await strapiClient.register(payload);
    if (typeof localStorage !== 'undefined') {
      const jwt = localStorage.getItem('halty_strapi_jwt');
      if (jwt) this.setToken(jwt);
    }
    return result;
  }

  public async getMe(): Promise<UserAccount | null> {
    return strapiClient.getMe();
  }

  public async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount | null> {
    return strapiClient.updateProfile(profile);
  }

  public async connectTelegram(_userId: string, username: string): Promise<{ success: boolean; message: string }> {
    const clean = username.replace(/^@/, '');
    const updated = await strapiClient.updateProfile({ tgUsername: clean, tgConnected: true });
    if (!updated) return { success: false, message: 'Не удалось сохранить Telegram' };
    return { success: true, message: `Telegram @${clean} сохранён` };
  }

  public async sendTestTelegramNotification(_role: 'user' | 'admin', text?: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: text || 'Тестовое уведомление отмечено. Доставка в Telegram идёт через профиль в Strapi.',
    };
  }
}

export const apiClient = new ApiClient();
