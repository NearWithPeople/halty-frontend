import type { UserRole } from '../types';

export function isPlatformAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/** Работодатель или админ — кабинет нанимателя, заявки, создание вакансий */
export function isEmployerSide(role: UserRole): boolean {
  return role === 'admin' || role === 'employer';
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Администратор';
    case 'employer':
      return 'Работодатель';
    default:
      return 'Исполнитель';
  }
}

export function roleShortBadge(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'АДМИН';
    case 'employer':
      return 'HR';
    default:
      return 'ИСПОЛН.';
  }
}
