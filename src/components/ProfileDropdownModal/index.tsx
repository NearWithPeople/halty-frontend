import './styles.css';
import '../PanelScroll/styles.css';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Camera, FileText, TrendingUp, Settings, LogOut, CheckCircle2, ChevronRight, ArrowLeft,
  Save, Headphones, Phone, AlertTriangle, Send, Bell, Check,
  Building2, Briefcase, Plus, ShieldCheck, FileCheck, Users, Trash2
} from 'lucide-react';
import type { UserAccount, UserRole } from '../../types';
import { isEmployerSide, isPlatformAdmin } from '../../utils/roles';
import { dbStore } from '../../services/dbStore';
import { useTheme } from '../../hooks/useTheme';
import { ThemePreferencePicker } from '../ThemePreferencePicker';

interface ProfileDropdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
  onOpenCreateVacancy?: () => void;
  onOpenAdminMembers?: () => void;
  currentUser: UserAccount;
  onSwitchRole?: (role: UserRole) => void;
  onLogout: () => void;
  isStatic?: boolean;
  initialSubView?: SubView;
}

type SubView =
  | 'menu'
  | 'resume'
  | 'docs'
  | 'stats'
  | 'settings'
  | 'edit'
  | 'support'
  | 'telegram'
  | 'admin_vacancies'
  | 'company_legal'
  | 'admin_stats';

export const ProfileDropdownModal: React.FC<ProfileDropdownModalProps> = ({
  isOpen,
  onClose,
  onOpenHistory,
  onOpenCreateVacancy,
  onOpenAdminMembers,
  currentUser,
  onLogout,
  isStatic = false,
  initialSubView = 'menu',
}) => {
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [subView, setSubView] = useState<SubView>(initialSubView);
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [companyName, setCompanyName] = useState(
    currentUser.companyName || (currentUser.role === 'admin' ? 'ООО «Халти Технологии»' : '')
  );
  const [aboutMe, setAboutMe] = useState(
    currentUser.role === 'admin'
      ? 'Официальный аккаунт администрации платформы Halty. Размещение и модерация смен по Минску, проверка соискателей.'
      : 'Ответственный исполнитель. Опыт работы бариста, сотрудником склада и курьером. Всегда пунктуален.'
  );

  // Telegram Notifications State
  const [tgConnected, setTgConnected] = useState<boolean>(() => {
    return localStorage.getItem(`halty_tg_connected_${currentUser.id}`) === 'true';
  });
  const [tgUsername, setTgUsername] = useState<string>(() => {
    return localStorage.getItem(`halty_tg_username_${currentUser.id}`) || (currentUser.role === 'user' ? 'egor_makarov' : 'admin_halty');
  });
  const [tgInputUsername, setTgInputUsername] = useState('');
  const [tgNotifyShifts, setTgNotifyShifts] = useState(true);
  const [tgNotifyStatus, setTgNotifyStatus] = useState(true);
  const [tgNotifyChat, setTgNotifyChat] = useState(true);
  const [tgNotifyReminder, setTgNotifyReminder] = useState(true);
  const [toastText, setToastText] = useState<string | null>(null);
  const [, setStoreTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    return dbStore.subscribe(() => setStoreTick((n) => n + 1));
  }, [isOpen]);

  const allVacancies = dbStore.getVacancies();
  const myPublishedShifts = useMemo(
    () => allVacancies.filter((v) => dbStore.canDeleteVacancy(v)),
    [allVacancies]
  );

  const showToastNotification = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3500);
  };

  const handleConnectTelegram = async (username: string) => {
    const clean = username.trim().replace(/^@/, '');
    if (!clean) return;
    setTgUsername(clean);
    setTgConnected(true);
    localStorage.setItem(`halty_tg_connected_${currentUser.id}`, 'true');
    localStorage.setItem(`halty_tg_username_${currentUser.id}`, clean);
    try {
      await dbStore.connectTelegram(clean);
    } catch (e) {
      console.warn('Backend Telegram connect error:', e);
    }
    showToastNotification(`Telegram @${clean} успешно подключён к серверу Halty!`);
  };

  const handleDisconnectTelegram = () => {
    setTgConnected(false);
    localStorage.removeItem(`halty_tg_connected_${currentUser.id}`);
    dbStore.updateProfile({ tgConnected: false });
    showToastNotification('Telegram отключён от аккаунта Halty');
  };

  const handleSendTestNotification = async () => {
    try {
      await dbStore.sendTestTelegramPush(currentUser.role);
    } catch (e) {
      console.warn('Backend Telegram test push error:', e);
    }
    if (currentUser.role === 'admin') {
      showToastNotification(`🔔 [Сервер @HaltyNotifyBot] Новый отклик на смену Бариста в «Зерно» от Егора М.!`);
    } else {
      showToastNotification(`🔔 [Сервер @HaltyNotifyBot] Смена в ТЦ Galileo подтверждена! Ждём завтра к 10:00.`);
    }
  };

  if (!isOpen) return null;

  const isAdmin = isPlatformAdmin(currentUser.role);
  const isEmployer = isEmployerSide(currentUser.role);

  const modalContent = (
    <div className={`bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/90 dark:border-slate-700/90 overflow-hidden flex flex-col ${isStatic ? 'w-full max-w-[400px] shadow-[0_24px_70px_rgba(15,23,42,0.15)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)] relative max-h-[780px]' : 'shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)] max-h-[88vh]'}`}>
      {/* Header Close button */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
        {subView !== 'menu' ? (
          <button
            type="button"
            onClick={() => setSubView('menu')}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isEmployer ? 'Кабинет работодателя' : 'Профиль исполнителя'}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

          <div className="overflow-y-auto panel-scroll px-5 pb-6">
            {/* 1. MENU VIEW */}
            {subView === 'menu' && (
              <div className="space-y-4 pt-1">
                {/* Role Status Badge */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-600/80">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isAdmin
                          ? 'bg-purple-600 animate-pulse'
                          : currentUser.role === 'employer'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                      {isAdmin
                        ? 'Режим: АДМИН'
                        : currentUser.role === 'employer'
                          ? 'Режим: Работодатель'
                          : 'Режим: Исполнитель'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Минск</span>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative group cursor-pointer" onClick={() => setSubView('edit')}>
                    <div
                      className={`w-20 h-20 rounded-full text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ${
                        isAdmin
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-800 ring-purple-50'
                          : currentUser.role === 'employer'
                            ? 'bg-gradient-to-tr from-amber-600 to-orange-800 ring-amber-50'
                            : 'bg-gradient-to-tr from-emerald-600 to-emerald-800 ring-emerald-50'
                      }`}
                    >
                      {currentUser.avatar || (isAdmin ? 'АД' : currentUser.role === 'employer' ? 'HR' : 'ЕМ')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Name & Role Details */}
                  <div className="mt-3 flex items-center gap-1.5 justify-center flex-wrap">
                    <h2 className="text-base font-black text-slate-900 leading-tight">{profileName}</h2>
                    {isAdmin ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-black text-[10px] uppercase border border-purple-200">
                        АДМИН
                      </span>
                    ) : currentUser.role === 'employer' ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] uppercase border border-amber-200">
                        Работодатель
                      </span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500 shrink-0" />
                    )}
                  </div>
                  {isEmployer && (
                    <p className={`text-xs font-bold mt-0.5 ${isAdmin ? 'text-purple-700' : 'text-amber-800'}`}>
                      {companyName}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">{profileEmail}</p>
                  <p className="text-xs text-slate-400">{profilePhone}</p>

                  <button
                    type="button"
                    onClick={() => setSubView('edit')}
                    className="mt-3 px-5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    {isEmployer ? 'Настройки профиля организации' : 'Редактировать профиль'}
                  </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                {/* MENU ITEMS: Differentiated for Admin vs Worker */}
                <div className="space-y-1">
                  {isEmployer ? (
                    /* ─── EMPLOYER / ADMIN MENU ─── */
                    <>
                      {isAdmin && onOpenAdminMembers && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAdminMembers();
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900/5 dark:hover:bg-white/5 transition-all text-left cursor-pointer group border border-dashed border-slate-300 dark:border-slate-600 mb-1"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                Работодатели и исполнители
                              </span>
                              <span className="text-[11px] text-slate-500">Реестр участников (демо)</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      )}

                      {/* Опубликованные вакансии */}
                      <button
                        type="button"
                        onClick={() => setSubView('admin_vacancies')}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-purple-50/60 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block group-hover:text-purple-700 transition-colors">
                              Опубликованные вакансии
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {myPublishedShifts.length} ваших смен · {allVacancies.length} на карте
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {allVacancies.length} смен
                        </span>
                      </button>

                      {/* Юридические данные и УНП */}
                      <button
                        type="button"
                        onClick={() => setSubView('company_legal')}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                              Юридические данные компании
                            </span>
                            <span className="text-[11px] text-slate-500">УНП 193746182, эскроу-счёт</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ ЕГР
                        </span>
                      </button>

                      {/* Статистика работодателя */}
                      <button
                        type="button"
                        onClick={() => setSubView('admin_stats')}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block group-hover:text-amber-600 transition-colors">
                              Статистика работодателя
                            </span>
                            <span className="text-[11px] text-slate-500">34 смены, рейтинг 5.0 ★</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>
                    </>
                  ) : (
                    /* ─── WORKER SPECIFIC MENU ITEMS ─── */
                    <>
                      {/* Профиль */}
                      <button
                        type="button"
                        onClick={() => setSubView('resume')}
                        className="w-full flex items-center justify-between p-3.5 rounded-[22px] hover:bg-slate-50 transition-all text-left cursor-pointer group border border-slate-100/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[18px] bg-slate-100 text-[#181D38] flex items-center justify-center shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="text-sm font-extrabold text-[#181D38] block group-hover:text-blue-600 transition-colors">
                              Профиль
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">Специальности, документы и опыт</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Верифицирован
                        </span>
                      </button>
                    </>
                  )}

                  {/* Настройки (с Telegram внутри) */}
                  <button
                    type="button"
                    onClick={() => setSubView('settings')}
                    className="w-full flex items-center justify-between p-3.5 rounded-[22px] hover:bg-slate-50 transition-all text-left cursor-pointer group border border-slate-100/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[18px] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Settings className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-[#181D38] block group-hover:text-slate-950 transition-colors">
                          Настройки
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">Telegram, пуши и звук</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </button>

                  {/* Служба поддержки - стилизована как яркая красная плашка */}
                  <button
                    type="button"
                    onClick={() => setSubView('support')}
                    className="w-full flex items-center justify-between p-3.5 rounded-[22px] bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[18px] bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Headphones className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-rose-900 block">
                          Служба поддержки
                        </span>
                        <span className="text-[11px] text-rose-700 font-medium">Помощь и защита соискателя</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      24/7
                    </span>
                  </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                {/* Sign Out Button */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="px-6 py-2.5 rounded-2xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Выйти из аккаунта</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── ADMIN VIEW: ОПУБЛИКОВАННЫЕ ВАКАНСИИ ─── */}
            {subView === 'admin_vacancies' && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-purple-900">Вакансии вашей организации</h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                      {allVacancies.length} на карте
                    </span>
                  </div>
                  <p className="text-xs text-purple-950 leading-relaxed">
                    Смены, которые вы создали через «+ Вакансия», можно снять с карты в любой момент.
                  </p>
                </div>

                {onOpenCreateVacancy && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateVacancy();
                    }}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать новую вакансию</span>
                  </button>
                )}

                <div className="space-y-2 pt-1">
                  {myPublishedShifts.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4 px-2">
                      У вас пока нет своих смен на карте. Создайте вакансию и выберите точку на карте.
                    </p>
                  )}
                  {myPublishedShifts.map((vac) => (
                    <div
                      key={vac.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{vac.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{vac.locationName}</div>
                        <div className="text-xs font-black text-purple-700 dark:text-purple-300 mt-0.5">{vac.salary}</div>
                      </div>
                      <button
                        type="button"
                        title="Удалить смену"
                        onClick={() => {
                          if (!window.confirm(`Снять смену «${vac.title}» с карты?`)) return;
                          const res = dbStore.deleteOwnVacancy(vac.id);
                          if (res.ok) showToastNotification('Смена удалена');
                        }}
                        className="shrink-0 w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── ADMIN VIEW: ЮРИДИЧЕСКИЕ ДАННЫЕ И УНП ─── */}
            {subView === 'company_legal' && (
              <div className="space-y-4 pt-1 text-xs">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <h3 className="text-sm font-black text-blue-900">Реестр проверенных нанимателей</h3>
                  </div>
                  <p className="text-[11px] text-blue-950 leading-relaxed">
                    Юридическое лицо прошло верификацию в ЕГР Республики Беларусь. Оплата гарантируется через систему эскроу-депонирования.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block">Полное наименование организации:</span>
                    <span className="font-bold text-slate-900 text-xs">ООО «Халти Технологии»</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">УНП (Реестр РБ):</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">193746182</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Статус в ЕГР:</span>
                      <span className="font-bold text-emerald-600 text-xs">Действующее</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block">Юридический адрес:</span>
                    <span className="text-slate-800 text-xs">220035, г. Минск, пр-т Победителей, 103, оф. 412</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block">Регистрация:</span>
                    <span className="text-xs text-slate-700 font-medium">Минский городской исполнительный комитет, статус подтвержден</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Статус в ЕГР: <strong>Действующее юридическое лицо</strong></span>
                </div>
              </div>
            )}

            {/* ─── ADMIN VIEW: СТАТИСТИКА РАБОТОДАТЕЛЯ ─── */}
            {subView === 'admin_stats' && (
              <div className="space-y-4 pt-1 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                    <span className="text-2xl font-black text-purple-700 block">5.0 ★</span>
                    <span className="text-[10px] font-bold text-purple-900 uppercase">Рейтинг нанимателя</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-2xl font-black text-emerald-600 block">100%</span>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Оплат день в день</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Активных смен на платформе</span>
                    <span className="font-extrabold text-slate-900">{allVacancies.length} смен</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Всего откликов соискателей</span>
                    <span className="font-extrabold text-purple-700">48 кандидатов</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Успешно закрыто смен</span>
                    <span className="font-extrabold text-emerald-600">34 смены</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Выплачено соискателям</span>
                    <span className="font-extrabold text-slate-900">4 250 BYN</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── WORKER VIEW: ПРОФИЛЬ СОИСКАТЕЛЯ ─── */}
            {subView === 'resume' && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#181D38]">Профиль соискателя</h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                      Подтверждено
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Работодатели видят эти данные при отклике на смену.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">Специальности</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['Бариста', 'Сборщик заказов', 'Комплектовщик', 'Курьер', 'Официант'].map((s) => (
                        <span key={s} className="px-2.5 py-1 rounded-xl bg-slate-100 font-semibold text-slate-800">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">О себе и опыт</span>
                    <p className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed">
                      {aboutMe}
                    </p>
                  </div>

                  {/* Integrated Documents directly in Profile view */}
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">Проверенные документы</span>
                    <div className="space-y-1.5 mt-1.5">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800">Паспорт гражданина РБ</span>
                        <span className="text-[10px] font-bold text-emerald-700">✓ Проверен</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800">Медицинская справка (санкнижка)</span>
                        <span className="text-[10px] font-bold text-emerald-700">✓ Активна</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSubView('edit')}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                >
                  Редактировать данные резюме
                </button>
              </div>
            )}

            {/* ─── WORKER VIEW: ДОКУМЕНТЫ СОИСКАТЕЛЯ ─── */}
            {subView === 'docs' && (
              <div className="space-y-3 pt-1">
                <h3 className="text-sm font-black text-slate-900">Верифицированные документы соискателя</h3>
                <p className="text-xs text-slate-500">
                  Документы проверены службой безопасности Halty.
                </p>

                <div className="space-y-2 pt-1">
                  {[
                    { title: 'Паспорт гражданина РБ', sub: 'Серия МР, выдан Советским РУВД г. Минска', status: 'Проверен' },
                    { title: 'Медицинская справка (ф. 1 здр/у-10)', sub: 'Действительна до 15.11.2026', status: 'Активна' },
                    { title: 'Договор оферты и согласие', sub: 'Подписано электронной подписью', status: 'Подписан' },
                  ].map((doc) => (
                    <div key={doc.title} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{doc.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{doc.sub}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── WORKER VIEW: СТАТИСТИКА СОИСКАТЕЛЯ ─── */}
            {subView === 'stats' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                    <span className="text-2xl font-black text-amber-600 block">4.9 ★</span>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Рейтинг (14 отзывов)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                    <span className="text-2xl font-black text-indigo-600 block">100%</span>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase">Пунктуальность</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Успешно отработано смен</span>
                    <span className="font-extrabold text-slate-900">14 смен</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Отказов после подтверждения</span>
                    <span className="font-extrabold text-emerald-600">0%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Позиция в рейтинге Минска</span>
                    <span className="font-extrabold text-slate-900">Топ-5%</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── EDIT PROFILE VIEW ─── */}
            {subView === 'edit' && (
              <div className="space-y-3 pt-1">
                <h3 className="text-sm font-black text-slate-900">
                  {isAdmin ? 'Профиль организации' : 'Редактирование профиля'}
                </h3>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {isAdmin ? 'ФИО представителя / HR' : 'Имя и фамилия'}
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Название компании
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Контактный телефон</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {isAdmin ? 'О компании' : 'О себе'}
                    </label>
                    <textarea
                      rows={3}
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    dbStore.updateProfile({
                      name: profileName,
                      phone: profilePhone,
                      email: profileEmail,
                      companyName: isAdmin ? companyName : undefined,
                    });
                    setSubView('menu');
                    showToastNotification('Данные сохранены');
                  }}
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить изменения</span>
                </button>
              </div>
            )}

            {/* ─── SETTINGS VIEW ─── */}
            {subView === 'settings' && (
              <div className="space-y-3 pt-1 text-xs text-slate-800 dark:text-slate-200">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {isAdmin ? 'Параметры платформы и безопасности' : 'Настройки приложения'}
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-100 block">Тема оформления</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      «Как в системе» следует настройкам браузера или ОС. Можно зафиксировать светлую или тёмную тему.
                    </p>
                    <ThemePreferencePicker value={themePreference} onChange={setThemePreference} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span>{isAdmin ? 'Уведомления о новых откликах' : 'Уведомления о новых сменах'}</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span>Звуковые оповещения в чатах</span>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span>Язык интерфейса</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Русский (RU)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── SUPPORT VIEW ─── */}
            {subView === 'support' && (
              <div className="space-y-4 pt-1 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <h3 className="text-sm font-black">
                      {isAdmin ? 'Служба заботы о работодателях' : 'Защита от обмана'}
                    </h3>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    {isAdmin
                      ? 'Персональный менеджер помогает с модерацией смен, подбором персонала и бухгалтерским закрытием расчётов по УНП.'
                      : 'Если работодатель обманывает, меняет оговоренные условия смены или отказывается выплачивать расчёт — пишите сразу в чат куратору! Мы моментально реагируем, блокируем недобросовестных работодателей и помогаем получить выплату.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-500 block text-[10px] uppercase">Контакты дежурной службы</span>
                  <a
                    href="tel:+375172008090"
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-between transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>Горячая линия Минск</span>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px]">+375 (17) 200-80-90</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenHistory?.();
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors border border-blue-200 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-blue-600" />
                    <span>Открыть диалог с куратором в чате</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                  ⏱ Среднее время ответа куратора — <strong>1-2 минуты</strong>. Дежурная служба работает без выходных.
                </div>
              </div>
            )}

            {/* ─── TELEGRAM NOTIFICATIONS VIEW ─── */}
            {subView === 'telegram' && (
              <div className="space-y-4 pt-1 text-xs">
                {/* Telegram header banner */}
                <div className="p-4 rounded-3xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        tgConnected ? 'bg-emerald-400 text-slate-950 shadow-xs' : 'bg-white/20 text-white'
                      }`}
                    >
                      {tgConnected ? '● Бот активен' : 'Не привязан'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-black">Telegram-уведомления</h3>
                    <p className="text-[11px] text-sky-100 mt-0.5 leading-relaxed">
                      Официальный бот <strong>@HaltyNotifyBot</strong>{' '}
                      {isAdmin
                        ? 'оповестит о новых откликах кандидатов и сообщениях со смен.'
                        : 'мгновенно пришлёт подтверждение смены и сообщения работодателя.'}
                    </p>
                  </div>
                </div>

                {tgConnected ? (
                  /* Connected State */
                  <div className="space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Привязанный аккаунт</span>
                          <span className="text-xs font-mono text-emerald-800 font-extrabold">@{tgUsername}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectTelegram}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        Отвязать
                      </button>
                    </div>

                    {/* Notification preferences */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Какие уведомления отправлять в бот:
                      </span>

                      {isAdmin ? (
                        <>
                          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">Новые отклики соискателей</span>
                              <span className="text-[10px] text-slate-500">Когда кандидат подал заявку на смену</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={tgNotifyStatus}
                              onChange={(e) => setTgNotifyStatus(e.target.checked)}
                              className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">Прибытие соискателя на точку</span>
                              <span className="text-[10px] text-slate-500">Геолокация подтверждена</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={tgNotifyShifts}
                              onChange={(e) => setTgNotifyShifts(e.target.checked)}
                              className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">Одобрение выхода на смену</span>
                              <span className="text-[10px] text-slate-500">Когда работодатель подтвердил вас</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={tgNotifyStatus}
                              onChange={(e) => setTgNotifyStatus(e.target.checked)}
                              className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">Новые смены рядом (&lt; 2 км)</span>
                              <span className="text-[10px] text-slate-500">Горячие смены в вашем районе Минска</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={tgNotifyShifts}
                              onChange={(e) => setTgNotifyShifts(e.target.checked)}
                              className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                            />
                          </label>
                        </>
                      )}

                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">Сообщения в чате смены</span>
                          <span className="text-[10px] text-slate-500">Личные сообщения со смены</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={tgNotifyChat}
                          onChange={(e) => setTgNotifyChat(e.target.checked)}
                          className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            {isAdmin ? 'Запросы на закрытие смены и выплату' : 'Напоминание перед сменой'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isAdmin ? 'Подтверждение часов работы' : 'За 2 часа до начала смены'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={tgNotifyReminder}
                          onChange={(e) => setTgNotifyReminder(e.target.checked)}
                          className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Test Notification Button */}
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      className="w-full py-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all border border-sky-200 cursor-pointer shadow-2xs active:scale-98"
                    >
                      <Bell className="w-4 h-4 text-sky-600" />
                      <span>Отправить тестовое уведомление в Telegram</span>
                    </button>
                  </div>
                ) : (
                  /* Disconnected State / Connect flow */
                  <div className="space-y-4">
                    <div className="p-4 rounded-[24px] bg-slate-50 border border-slate-200 text-center space-y-2">
                      <p className="text-xs text-slate-700 font-bold leading-relaxed">
                        Для мгновенного получения уведомлений о сменах достаточно запустить нашего бота в Telegram:
                      </p>
                      <a
                        href="https://t.me/HaltyNotifyBot"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-sky-400" />
                        <span>Запустить бота @HaltyNotifyBot</span>
                      </a>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Или укажите ваш Telegram Username
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                          <input
                            type="text"
                            placeholder="username"
                            value={tgInputUsername}
                            onChange={(e) => setTgInputUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnectTelegram(tgInputUsername)}
                            className="w-full text-xs pl-7 pr-3 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConnectTelegram(tgInputUsername || (isAdmin ? 'admin_halty' : 'egor_makarov'))}
                          className="py-2.5 px-5 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          Привязать
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inline Toast Notification Banner */}
          {toastText && (
            <div className="p-3 bg-slate-900 text-white text-xs font-bold text-center border-t border-slate-800 animate-fadeIn flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toastText}</span>
            </div>
          )}
        </div>
      );

  if (isStatic) {
    return modalContent;
  }

  return (
    <>
      {/* Dimmed Blur Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-250 animate-fadeIn"
      />

      {/* Floating Card anchored top-right */}
      <div className="fixed top-4 sm:top-5 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[390px] max-w-[420px] pointer-events-auto select-none animate-slideDown">
        {modalContent}
      </div>
    </>
  );
};
