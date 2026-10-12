import type { Coordinates } from '../types';

export type ResponseStatus = 'active' | 'pending' | 'cancelled';

export interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'employer';
  time: string;
  isSystem?: boolean;
}

export interface ApplicationItem {
  id: string;
  vacancyId?: string;
  role: string;
  company: string;
  status: ResponseStatus;
  statusLabel: string;
  location: string;
  coordinates?: Coordinates;
  salary: string;
  scheduleDate: string;
  duration?: string;
  walkTime?: string;
  requirementsNotes?: string[];
  description: string;
  appliedDate: string;
  color: string;
  progressStep: number;
  unread?: boolean;
  messages: ChatMessage[];
}
