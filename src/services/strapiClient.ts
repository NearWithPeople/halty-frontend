/**
 * Strapi CMS Integration Client for Halty (Strapi 5 REST + JWT)
 */

import type { Vacancy, UserAccount } from '../types';
import type { ApplicationItem, ChatMessage } from '../models/application';
import { backendConfig } from '../config/backend';

function resolveStrapiBaseUrl(override?: string): string {
  const raw = override || backendConfig.strapiUrl;
  return String(raw).replace(/\/$/, '') || '/cms';
}

function mapVacancy(item: Record<string, unknown>): Vacancy {
  const documentId = item.documentId ?? item.id;
  return {
    id: String(documentId),
    title: String(item.title ?? ''),
    company: String(item.company ?? ''),
    employerName: String(item.employerName ?? 'АДМИН'),
    salary: String(item.salary ?? ''),
    category: item.category as Vacancy['category'],
    categoryLabel: String(item.categoryLabel ?? ''),
    attachmentType: (item.attachmentType as Vacancy['attachmentType']) || 'building',
    coordinates: {
      lat: Number(item.lat ?? 53.9045),
      lng: Number(item.lng ?? 27.5615),
    },
    address: item.address ? String(item.address) : undefined,
    locationName: String(item.locationName ?? ''),
    description: String(item.description ?? ''),
    requirements: Array.isArray(item.requirements)
      ? (item.requirements as string[])
      : ['Паспорт / ВНЖ', 'Опрятность'],
    schedule: String(item.schedule ?? ''),
    payoutType: String(item.payoutType ?? ''),
    color: String(item.color ?? '#3b82f6'),
    accentColor: String(item.accentColor ?? '#1e3a8a'),
    iconType: (item.iconType as Vacancy['iconType']) || 'coffee',
    buildingHeight: item.buildingHeight != null ? Number(item.buildingHeight) : undefined,
    zoneRadius: item.zoneRadius != null ? Number(item.zoneRadius) : undefined,
    createdAt: item.createdAt ? new Date(String(item.createdAt)).getTime() : Date.now(),
    createdByRole: 'admin',
  };
}

function mapApplicationStatus(status: string): ApplicationItem['status'] {
  if (status === 'active') return 'active';
  if (status === 'cancelled' || status === 'rejected') return 'cancelled';
  return 'pending';
}

function mapApplication(item: Record<string, unknown>): ApplicationItem {
  const documentId = item.documentId ?? item.id;
  const rawStatus = String(item.status ?? 'pending');

  return {
    id: String(documentId),
    role: String(item.role ?? 'Смена'),
    company: String(item.company ?? ''),
    location: String(item.location ?? ''),
    coordinates:
      item.lat != null && item.lng != null
        ? { lat: Number(item.lat), lng: Number(item.lng) }
        : undefined,
    salary: String(item.salary ?? ''),
    scheduleDate: String(item.scheduleDate ?? 'Сегодня с 10:00'),
    duration: String(item.duration ?? '8 часов'),
    walkTime: String(item.walkTime ?? '~10 минут пешком'),
    description: String(item.description ?? ''),
    appliedDate: String(item.appliedDate ?? 'Сегодня'),
    color: String(item.color ?? '#3b82f6'),
    progressStep: Number(item.progressStep ?? 1),
    status: mapApplicationStatus(rawStatus),
    statusLabel: String(item.statusLabel ?? 'Ожидает'),
    requirementsNotes: Array.isArray(item.requirementsNotes)
      ? (item.requirementsNotes as string[])
      : ['Паспорт гражданина / ВНЖ'],
    messages: Array.isArray(item.messages)
      ? (item.messages as Record<string, unknown>[]).map((m) => ({
          id: String(m.id ?? Date.now()),
          text: String(m.text ?? ''),
          from: m.from === 'employer' || m.sender_role === 'admin' ? 'employer' : 'user',
          time: String(m.time ?? m.timestamp ?? 'Только что'),
          isSystem: Boolean(m.isSystem),
        }))
      : [],
  };
}

export class StrapiClient {
  private baseUrl: string;
  private jwt: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = resolveStrapiBaseUrl(baseUrl);
    this.jwt = localStorage.getItem('halty_strapi_jwt');
  }

  public setToken(jwt: string) {
    this.jwt = jwt;
    localStorage.setItem('halty_strapi_jwt', jwt);
  }

  public clearToken() {
    this.jwt = null;
    localStorage.removeItem('halty_strapi_jwt');
  }

  public hasToken(): boolean {
    return Boolean(this.jwt);
  }

  private apiUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}/api${p}`;
  }

  private getHeaders(auth = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (auth && this.jwt) {
      headers.Authorization = `Bearer ${this.jwt}`;
    }
    return headers;
  }

  private normalizeItem(item: unknown): Record<string, unknown> {
    if (!item || typeof item !== 'object') return {};
    const row = item as Record<string, unknown>;
    if (row.attributes && typeof row.attributes === 'object') {
      return { id: row.id, ...(row.attributes as Record<string, unknown>) };
    }
    return row;
  }

  private normalizeList(response: { data?: unknown }): Record<string, unknown>[] {
    if (!response?.data) return [];
    if (Array.isArray(response.data)) {
      return response.data.map((i) => this.normalizeItem(i));
    }
    return [this.normalizeItem(response.data)];
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(this.apiUrl('/vacancies?pagination[pageSize]=1'), {
        headers: this.getHeaders(false),
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  public async getVacancies(params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    category?: string;
    search?: string;
  }): Promise<Vacancy[]> {
    try {
      if (params?.lat != null && params?.lng != null && params?.radius != null) {
        const spatialUrl = this.apiUrl(
          `/vacancies/nearby?lat=${params.lat}&lng=${params.lng}&radius=${params.radius}`
        );
        const spatialRes = await fetch(spatialUrl, { headers: this.getHeaders(false) });
        if (spatialRes.ok) {
          const sData = await spatialRes.json();
          return this.normalizeList(sData).map(mapVacancy);
        }
      }

      const query = new URLSearchParams();
      query.set('populate', '*');
      query.set('pagination[pageSize]', '100');
      query.set('status', 'published');

      if (params?.category && params.category !== 'all') {
        query.set('filters[category][$eq]', params.category);
      }
      if (params?.search) {
        query.set('filters[title][$containsi]', params.search);
      }

      const res = await fetch(this.apiUrl(`/vacancies?${query.toString()}`), {
        headers: this.getHeaders(false),
      });
      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      return this.normalizeList(data).map(mapVacancy);
    } catch (e) {
      console.warn('[StrapiClient] getVacancies error:', e);
      return [];
    }
  }

  public async createVacancy(vacancy: Partial<Vacancy>): Promise<Vacancy | null> {
    try {
      const payload = {
        data: {
          title: vacancy.title,
          company: vacancy.company,
          employerName: 'АДМИН',
          salary: vacancy.salary,
          category: vacancy.category,
          categoryLabel: vacancy.categoryLabel,
          attachmentType: vacancy.attachmentType || 'building',
          lat: vacancy.coordinates?.lat,
          lng: vacancy.coordinates?.lng,
          address: vacancy.address,
          locationName: vacancy.locationName,
          description: vacancy.description,
          requirements: vacancy.requirements,
          schedule: vacancy.schedule,
          payoutType: vacancy.payoutType,
          color: vacancy.color,
          accentColor: vacancy.accentColor,
          iconType: vacancy.iconType,
          buildingHeight: vacancy.buildingHeight,
          zoneRadius: vacancy.zoneRadius,
          createdByRole: 'admin',
        },
      };

      const res = await fetch(this.apiUrl('/vacancies?status=published'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      return mapVacancy(this.normalizeItem(data.data));
    } catch (e) {
      console.warn('[StrapiClient] createVacancy error:', e);
      return null;
    }
  }

  public async deleteVacancy(id: string): Promise<boolean> {
    try {
      const res = await fetch(this.apiUrl(`/vacancies/${id}`), {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn('[StrapiClient] deleteVacancy error:', e);
      return false;
    }
  }

  public async getApplications(): Promise<ApplicationItem[]> {
    try {
      const res = await fetch(this.apiUrl('/applications?populate=*'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      return this.normalizeList(data).map(mapApplication);
    } catch (e) {
      console.warn('[StrapiClient] getApplications error:', e);
      return [];
    }
  }

  public async createApplication(vacancy: Vacancy): Promise<ApplicationItem | null> {
    try {
      const res = await fetch(this.apiUrl('/applications'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          data: {
            vacancy: vacancy.id,
          },
        }),
      });

      if (res.status === 409) {
        const apps = await this.getApplications();
        return apps.find((a) => a.role.toLowerCase() === vacancy.title.toLowerCase()) ?? null;
      }

      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      return mapApplication(this.normalizeItem(data.data));
    } catch (e) {
      console.warn('[StrapiClient] createApplication error:', e);
      return null;
    }
  }

  public async updateApplicationStatus(
    id: string,
    update: { status?: string; step?: number; rejectionReason?: string }
  ): Promise<ApplicationItem | null> {
    try {
      const res = await fetch(this.apiUrl(`/applications/${id}/status`), {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      return mapApplication(this.normalizeItem(data.data));
    } catch (e) {
      console.warn('[StrapiClient] updateApplicationStatus error:', e);
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
      const res = await fetch(this.apiUrl(`/applications/${applicationId}/messages`), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ text, senderRole, senderName }),
      });
      if (!res.ok) throw new Error(`Strapi HTTP ${res.status}`);
      const data = await res.json();
      const m = data.data as Record<string, unknown>;
      return {
        id: String(m.id ?? Date.now()),
        text: String(m.text ?? text),
        from: m.from === 'employer' ? 'employer' : 'user',
        time: String(m.time ?? 'Только что'),
        isSystem: Boolean(m.isSystem),
      };
    } catch (e) {
      console.warn('[StrapiClient] sendChatMessage error:', e);
      return null;
    }
  }

  public async login(identifier: string, password: string): Promise<UserAccount | null> {
    try {
      const res = await fetch(this.apiUrl('/auth/local'), {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.jwt) this.setToken(data.jwt);
      return this.mapUser(data.user);
    } catch (e) {
      console.warn('[StrapiClient] login error:', e);
      return null;
    }
  }

  public async getMe(): Promise<UserAccount | null> {
    try {
      const res = await fetch(this.apiUrl('/users/me'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      const user = await res.json();
      return this.mapUser(user);
    } catch (e) {
      console.warn('[StrapiClient] getMe error:', e);
      return null;
    }
  }

  public async updateProfile(profile: Partial<UserAccount>): Promise<UserAccount | null> {
    try {
      const me = await this.getMe();
      if (!me) return null;

      const res = await fetch(this.apiUrl(`/users/${me.id}`), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          phone: profile.phone,
          tgUsername: profile.tgUsername,
          tgConnected: profile.tgConnected,
        }),
      });
      if (!res.ok) return null;
      const user = await res.json();
      return this.mapUser(user);
    } catch (e) {
      console.warn('[StrapiClient] updateProfile error:', e);
      return null;
    }
  }

  private mapUser(user: Record<string, unknown>): UserAccount {
    const email = String(user.email ?? '');
    const username = String(user.username ?? email);
    return {
      id: String(user.id ?? user.documentId ?? ''),
      name: username,
      email,
      phone: String(user.phone ?? '+375 (29) 123-45-67'),
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
      avatar: username.slice(0, 2).toUpperCase() || 'ХЛ',
      rating: 5.0,
      completedShifts: 10,
      punctuality: '100%',
      tgUsername: user.tgUsername ? String(user.tgUsername) : undefined,
      tgConnected: Boolean(user.tgConnected),
    };
  }
}

export const strapiClient = new StrapiClient();
