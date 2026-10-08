/** Демо-реестр участников платформы (только фронт, без API) */
export type PlatformMemberKind = 'employer' | 'executor';

export interface PlatformMember {
  id: string;
  kind: PlatformMemberKind;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  companyName?: string;
  rating?: number;
  completedShifts?: number;
  verified: boolean;
  registeredAt: string;
  city: string;
}

export const DEMO_PLATFORM_EMPLOYERS: PlatformMember[] = [
  {
    id: 'emp-1',
    kind: 'employer',
    name: 'Администратор Halty',
    email: 'admin@halty.by',
    phone: '+375 (17) 200-80-90',
    avatar: 'АД',
    companyName: 'ООО «Халти Технологии»',
    rating: 5.0,
    verified: true,
    registeredAt: '2024-01-12',
    city: 'Минск',
  },
  {
    id: 'emp-2',
    kind: 'employer',
    name: 'Анна Коваль',
    email: 'hr@zerno.coffee',
    phone: '+375 (29) 555-12-01',
    avatar: 'АК',
    companyName: 'Кофейня «Зерно»',
    rating: 4.8,
    verified: true,
    registeredAt: '2024-06-03',
    city: 'Минск',
  },
  {
    id: 'emp-3',
    kind: 'employer',
    name: 'Дмитрий Лещук',
    email: 'staff@green-hyper.by',
    phone: '+375 (33) 701-44-88',
    avatar: 'ДЛ',
    companyName: 'Green Гипермаркет',
    rating: 4.6,
    verified: true,
    registeredAt: '2024-08-19',
    city: 'Минск',
  },
  {
    id: 'emp-4',
    kind: 'employer',
    name: 'Ирина Савчук',
    email: 'employer@halty.by',
    phone: '+375 (44) 120-33-77',
    avatar: 'ИС',
    companyName: 'Логистик-Групп Минск',
    rating: 4.9,
    verified: false,
    registeredAt: '2025-11-02',
    city: 'Минск',
  },
  {
    id: 'emp-5',
    kind: 'employer',
    name: 'Павел Жук',
    email: 'events@falconclub.by',
    phone: '+375 (29) 880-21-09',
    avatar: 'ПЖ',
    companyName: 'Falcon Club',
    rating: 4.7,
    verified: true,
    registeredAt: '2025-02-14',
    city: 'Минск',
  },
];

export const DEMO_PLATFORM_EXECUTORS: PlatformMember[] = [
  {
    id: 'exec-1',
    kind: 'executor',
    name: 'Егор Макаров',
    email: 'egor.makarov@gmail.com',
    phone: '+375 (29) 123-45-67',
    avatar: 'ЕМ',
    rating: 4.9,
    completedShifts: 14,
    verified: true,
    registeredAt: '2024-03-20',
    city: 'Минск',
  },
  {
    id: 'exec-2',
    kind: 'executor',
    name: 'Мария Волкова',
    email: 'maria.v@mail.ru',
    phone: '+375 (25) 901-22-18',
    avatar: 'МВ',
    rating: 4.7,
    completedShifts: 31,
    verified: true,
    registeredAt: '2024-05-11',
    city: 'Минск',
  },
  {
    id: 'exec-3',
    kind: 'executor',
    name: 'Артём Сидоренко',
    email: 'artem.sidor@gmail.com',
    phone: '+375 (29) 712-08-44',
    avatar: 'АС',
    rating: 4.5,
    completedShifts: 8,
    verified: false,
    registeredAt: '2025-09-01',
    city: 'Минск',
  },
  {
    id: 'exec-4',
    kind: 'executor',
    name: 'Ксения Романова',
    email: 'ksenia.r@yandex.by',
    phone: '+375 (33) 640-55-90',
    avatar: 'КР',
    rating: 5.0,
    completedShifts: 22,
    verified: true,
    registeredAt: '2024-11-07',
    city: 'Минск',
  },
  {
    id: 'exec-5',
    kind: 'executor',
    name: 'Никита Олехнович',
    email: 'nikita.o@gmail.com',
    phone: '+375 (44) 501-77-33',
    avatar: 'НО',
    rating: 4.4,
    completedShifts: 5,
    verified: true,
    registeredAt: '2026-01-18',
    city: 'Минск',
  },
  {
    id: 'exec-6',
    kind: 'executor',
    name: 'Виктория Нестер',
    email: 'v.nester@icloud.com',
    phone: '+375 (29) 333-66-11',
    avatar: 'ВН',
    rating: 4.8,
    completedShifts: 19,
    verified: true,
    registeredAt: '2025-04-22',
    city: 'Минск',
  },
];

export function getPlatformMembers(kind: PlatformMemberKind): PlatformMember[] {
  return kind === 'employer' ? DEMO_PLATFORM_EMPLOYERS : DEMO_PLATFORM_EXECUTORS;
}
