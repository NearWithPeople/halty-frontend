import './styles.css';
import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../../services/theme';
import { THEME_LABELS } from '../../services/theme';

interface ThemePreferencePickerProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const OPTIONS: { id: ThemePreference; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'system', icon: Monitor },
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
];

export const ThemePreferencePicker: React.FC<ThemePreferencePickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-2">
    {OPTIONS.map(({ id, icon: Icon }) => {
      const active = value === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-[10px] font-bold transition-all cursor-pointer ${
            active
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="leading-tight text-center">{THEME_LABELS[id]}</span>
        </button>
      );
    })}
  </div>
);
