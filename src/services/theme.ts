export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'halty_theme_preference';

type ThemeListener = (preference: ThemePreference, resolved: ResolvedTheme) => void;

const listeners = new Set<ThemeListener>();
let mediaQuery: MediaQueryList | null = null;

function parsePreference(raw: string | null): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  return parsePreference(localStorage.getItem(STORAGE_KEY));
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#f1f5f9');
}

function notifyListeners(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);
  listeners.forEach((listener) => listener(preference, resolved));
}

export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, preference);
  notifyListeners(preference);
}

export function initTheme(): ResolvedTheme {
  const preference = getThemePreference();
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);

  if (typeof window !== 'undefined' && !mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (getThemePreference() === 'system') {
        notifyListeners('system');
      }
    });
  }

  return resolved;
}

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  listener(getThemePreference(), resolveTheme(getThemePreference()));
  return () => listeners.delete(listener);
}

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Как в системе',
  light: 'Светлая',
  dark: 'Тёмная',
};
