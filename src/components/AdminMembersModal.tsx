import React, { useMemo, useState } from 'react';
import { X, Building2, UserRound, Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  getPlatformMembers,
  type PlatformMember,
  type PlatformMemberKind,
} from '../mock/mockData';

interface AdminMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminMembersModal: React.FC<AdminMembersModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<PlatformMemberKind>('employer');
  const [query, setQuery] = useState('');

  const members = useMemo(() => getPlatformMembers(tab), [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.companyName?.toLowerCase().includes(q) ?? false)
    );
  }, [members, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[88vh] bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Участники платформы</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Демо-реестр на фронте · без запросов к API</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTab('employer')}
              className={`py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'employer'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Работодатели ({getPlatformMembers('employer').length})
            </button>
            <button
              type="button"
              onClick={() => setTab('executor')}
              className={`py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'executor'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <UserRound className="w-3.5 h-3.5" />
              Исполнители ({getPlatformMembers('executor').length})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'employer' ? 'Компания, имя, email…' : 'Имя, email…'}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto panel-scroll px-5 pb-5 space-y-2">
          {filtered.length === 0 && (
            <li className="text-center py-8 text-sm text-slate-500">Никого не найдено</li>
          )}
          {filtered.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </ul>
      </div>
    </div>
  );
};

function MemberRow({ member }: { member: PlatformMember }) {
  const isEmployer = member.kind === 'employer';
  return (
    <li className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex gap-3">
      <div
        className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white font-black text-sm ${
          isEmployer
            ? 'bg-gradient-to-tr from-amber-600 to-orange-700'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-800'
        }`}
      >
        {member.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-900 dark:text-white">{member.name}</span>
          {member.verified ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Вериф.
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-3 h-3" /> На проверке
            </span>
          )}
        </div>
        {member.companyName && (
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300/90 truncate">{member.companyName}</p>
        )}
        <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
        <p className="text-[11px] text-slate-400">{member.phone}</p>
        <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] font-bold text-slate-500">
          <span>{member.city}</span>
          <span>·</span>
          <span>с {member.registeredAt}</span>
          {member.rating != null && (
            <>
              <span>·</span>
              <span>{member.rating.toFixed(1)} ★</span>
            </>
          )}
          {member.completedShifts != null && (
            <>
              <span>·</span>
              <span>{member.completedShifts} смен</span>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
