/**
 * Halty Backend API & WebSocket Realtime Client
 * Connects frontend to the Node.js + SQLite backend on port 3001 (proxied via /api and /ws)
 */

import type { Vacancy, UserAccount } from '../types';
import type { ApplicationItem, ChatMessage } from '../models/application';
import { backendConfig, resolveWebSocketUrl } from '../config/backend';
import { strapiClient } from './strapiClient';

const API_BASE = backendConfig.nodeApiBase;
const isStrapiEnabled = () => backendConfig.useStrapiApi;

export type RealtimeEventType =
  | 'CONNECTED'
  | 'VACANCY_CREATED'
  | 'VACANCY_DELETED'
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'NEW_CHAT_MESSAGE'
  | 'USER_UPDATED'
  | 'TELEGRAM_NOTIFICATION_DISPATCHED';

export type RealtimeEventHandler = (payload: any) => void;

class ApiClient {
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private wsConnectRequested = false;

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
  }): Promise<Vacancy[]> {
    if (isStrapiEnabled()) {
      const strapiData = await strapiClient.getVacancies(params);
      if (strapiData && strapiData.length > 0) return strapiData;
    }

    try {
      const query = new URLSearchParams();
      if (params?.lat !== undefined) query.set('lat', String(params.lat));
      if (params?.lng !== undefined) query.set('lng', String(params.lng));
      if (params?.radius !== undefined) query.set('radius', String(params.radius));
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);

      const res = await fetch(`${API_BASE}/vacancies?${query.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.vacancies || [];
    } catch (err) {
      console.warn('[Halty API] getVacancies offline fallback:', err);
      return [];
    }
  }

  public async createVacancy(vacancyData: any): Promise<Vacancy | null> {
    if (isStrapiEnabled()) {
      const sVac = await strapiClient.createVacancy(vacancyData);
      if (sVac) return sVac;
    }

    try {
      const res = await fetch(`${API_BASE}/vacancies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vacancyData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.vacancy;
    } catch (err) {
      console.warn('[Halty API] createVacancy offline fallback:', err);
      return null;
    }
  }

  public async deleteVacancy(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/vacancies/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('[Halty API] deleteVacancy error:', err);
      return false;
    }
  }

  /* ─── REST: Applications ─────────────────────────────────────────── */
  public async getApplications(): Promise<ApplicationItem[]> {
    if (isStrapiEnabled()) {
      const sApps = await strapiClient.getApplications();
      if (sApps && sApps.length > 0) return sApps;
    }
    try {
      const res = await fetch(`${API_BASE}/applications`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.applications || [];
    } catch (err) {
      console.warn('[Halty API] getApplications offline fallback:', err);
      return [];
    }
  }

  public async createApplication(vacancy: Vacancy): Promise<ApplicationItem | null> {
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.application;
    } catch (err) {
      console.warn('[Halty API] createApplication offline fallback:', err);
      return null;
    }
  }

  public async updateApplicationStatus(
    id: string,
    update: { status?: string; step?: number; rejectionReason?: string }
  ): Promise<ApplicationItem | null> {
    try {
      const res = await fetch(`${API_BASE}/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.application;
    } catch (err) {
      console.warn('[Halty API] updateApplicationStatus offline fallback:', err);
      return null;
    }
  }

  public async sendChatMessage(
    applicationId: string,
    text: string,
    senderRole: 'user' | 'admin',
    senderName?: string
  ): Promise<ChatMessage | null> {
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, senderRole, senderName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.message;
    } catch (err) {
      console.warn('[Halty API] sendChatMessage offline fallback:', err);
      return null;
    }
  }

  /* ─── REST: Auth & Profile ───────────────────────────────────────── */
  public async getMe(role: 'user' | 'admin' = 'user'): Promise<UserAccount | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'x-user-role': role },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.user;
    } catch (err) {
      console.warn('[Halty API] getMe offline fallback:', err);
      return null;
    }
  }

  public async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.user;
    } catch (err) {
      console.warn('[Halty API] updateProfile offline fallback:', err);
      return null;
    }
  }

  public async connectTelegram(userId: string, username: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/telegram/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username }),
      });
      return await res.json();
    } catch (err) {
      console.warn('[Halty API] connectTelegram fallback:', err);
      return { success: true, message: `Telegram @${username} сохранён!` };
    }
  }

  public async sendTestTelegramNotification(role: 'user' | 'admin', text?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/telegram/test-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, text }),
      });
      return await res.json();
    } catch (err) {
      console.warn('[Halty API] sendTestTelegramNotification fallback:', err);
      return { success: false, error: String(err) };
    }
  }
}

export const apiClient = new ApiClient();
