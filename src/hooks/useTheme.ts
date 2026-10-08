import { useEffect, useState } from 'react';
import {
  getThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../services/theme';

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getThemePreference()));

  useEffect(() => subscribeTheme((nextPreference, nextResolved) => {
    setPreferenceState(nextPreference);
    setResolved(nextResolved);
  }), []);

  const setPreference = (next: ThemePreference) => {
    setThemePreference(next);
  };

  return {
    preference,
    resolved,
    setPreference,
    isDark: resolved === 'dark',
  };
}
