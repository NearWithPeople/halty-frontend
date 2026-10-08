import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  X,
  Phone,
  Send,
  Building2,
  AlertCircle,
  Banknote,
  Flame
} from 'lucide-react';
import { dbStore } from '../services/dbStore';
import type { UserRole } from '../types';

interface LandingPageProps {
  onEnterApp: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>('user');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleOpenAuth = (role: UserRole = 'user') => {
    setAuthRole(role);
    setAuthError('');
    if (role === 'user') {
      setAuthEmail('egor.makarov@gmail.com');
      setAuthPassword('user123');
    } else if (role === 'employer') {
      setAuthEmail('employer@halty.by');
      setAuthPassword('employer2026');
    } else {
      setAuthEmail('admin@halty.by');
      setAuthPassword('admin2026');
    }
    setIsAuthModalOpen(true);
  };

  const handleQuickLogin = (role: UserRole) => {
    dbStore.login(role);
    onEnterApp(role);
  };

  const handleSubmitAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // Check credentials
    if (authRole === 'user') {
      if (authEmail.trim() === 'egor.makarov@gmail.com' || authEmail.includes('@')) {
        dbStore.login('user');
        setIsAuthModalOpen(false);
        onEnterApp('user');
      } else {
        setAuthError('Неверный email или пароль для исполнителя.');
      }
    } else if (authRole === 'employer') {
      if (authEmail.trim() === 'employer@halty.by' && authPassword.trim() === 'employer2026') {
        dbStore.login('employer');
        setIsAuthModalOpen(false);
        onEnterApp('employer');
      } else {
        setAuthError('Неверный пароль работодателя (по умолчанию: employer2026).');
      }
    } else {
      if (authEmail.trim() === 'admin@halty.by' && authPassword.trim() === 'admin2026') {
        dbStore.login('admin');
        setIsAuthModalOpen(false);
        onEnterApp('admin');
      } else {
        setAuthError('Неверный пароль администратора (по умолчанию: admin2026).');
      }
    }
  };

  // Real shift cards showcasing actual Minsk vacancies
  const previewVacancies = [
    {
      id: 'v1',
      title: 'Бариста на утреннюю смену',
      company: 'Кофейня «Зерно»',
      location: 'Минск, ул. Октябрьская, 19',
      pay: '110 Br',
      payDetail: 'за смену (13.75 Br/ч)',
      schedule: '08:00 – 16:00 (8 ч)',
      category: 'horeca',
      urgency: 'Горящая смена на завтра',
      slots: '1 место'
    },
    {
      id: 'v2',
      title: 'Сборщик заказов в гипермаркет',
      company: 'Green Гипермаркет',
      location: 'Минск, пр-т Победителей, 84',
      pay: '140 Br',
      payDetail: 'за смену (14.00 Br/ч)',
      schedule: '10:00 – 20:00 (10 ч)',
      category: 'retail',
      urgency: 'Оплата день в день',
      slots: '3 места'
    },
    {
      id: 'v3',
      title: 'Комплектовщик на отапливаемый склад',
      company: 'Логистик-Групп Минск',
      location: 'Минск, ул. Громова, 28',
      pay: '165 Br',
      payDetail: 'за смену (15.00 Br/ч)',
      schedule: '09:00 – 20:00 (11 ч)',
      category: 'warehouse',
      urgency: 'Спецодежда выдается',
      slots: '2 места'
    },
    {
      id: 'v4',
      title: 'Официант на вечерний банкет',
      company: 'Ресторан «Falcon Club»',
      location: 'Минск, пр-т Победителей, 20',
      pay: '135 Br',
      payDetail: '+ личные чаевые (~40 Br)',
      schedule: '17:00 – 23:30 (6.5 ч)',
      category: 'horeca',
      urgency: 'Сегодня вечером',
      slots: '4 места'
    },
    {
      id: 'v5',
      title: 'Мерчендайзер в ТРЦ Galleria Minsk',
      company: 'БелТоргСнаб',
      location: 'Минск, пр-т Победителей, 9',
      pay: '95 Br',
      payDetail: 'за 6 часов (15.80 Br/ч)',
      schedule: '12:00 – 18:00 (6 ч)',
      category: 'retail',
      urgency: 'Простая работа',
      slots: '1 место'
    },
    {
      id: 'v6',
      title: 'Курьер на собственном авто / скутере',
      company: 'Halty Express Delivery',
      location: 'Минск, Центр (весь город)',
      pay: '190 Br',
      payDetail: 'за 8 часов + ГСМ',
      schedule: 'Свободный график',
      category: 'delivery',
      urgency: 'Быстрый старт',
      slots: '5 мест'
    }
  ];

  const filteredVacancies = filterCategory === 'all' 
    ? previewVacancies 
    : previewVacancies.filter(v => v.category === filterCategory);

  return (
    <div className="w-full min-h-dvh bg-[#0f172a] text-slate-100 selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Briefcase className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Халти</span>
              <span className="ml-2 text-[11px] font-medium text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-500/10">
                Минск
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#vacancies" className="hover:text-white transition-colors">Вакансии рядом</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Как это работает</a>
            <a href="#guarantees" className="hover:text-white transition-colors">Гарантии и выплаты</a>
            <a href="#telegram" className="hover:text-white transition-colors flex items-center gap-1.5 text-sky-400 hover:text-sky-300">
              <Send className="w-3.5 h-3.5" /> Telegram Бот
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenAuth('user')}
              className="px-3.5 py-1.5 text-sm font-medium text-slate-200 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              Вход
            </button>
            <button
              onClick={() => handleOpenAuth('employer')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all"
            >
              <Building2 className="w-3.5 h-3.5" />
              Для работодателей
            </button>
            <button
              onClick={() => handleQuickLogin('user')}
              className="px-4 py-2 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              Открыть карту
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & Quick Actions */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>126 активных смен на карте Минска прямо сейчас</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
                Подработка рядом с домом.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  Оплата день в день.
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
                Сервис быстрых смен в Минске: бариста, комплектовщики, мерчендайзеры, курьеры и официанты. Выбирайте смену прямо на интерактивной карте, откликайтесь за 10 секунд и получайте деньги сразу после смены.
              </p>

              {/* Fast Login Action Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Worker demo */}
                <div 
                  onClick={() => handleQuickLogin('user')}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/60 transition-all cursor-pointer group hover:bg-slate-800/90 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Я соискатель</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-semibold text-white group-hover:text-emerald-300 text-base">
                    Войти как Егор Макаров
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Смотреть вакансии рядом, статус откликов и Telegram-уведомления
                  </p>
                </div>

                {/* Employer demo */}
                <div 
                  onClick={() => handleQuickLogin('employer')}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-amber-500/60 transition-all cursor-pointer group hover:bg-slate-800/90 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Работодатель</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-semibold text-white group-hover:text-amber-300 text-base">
                    Войти как Ирина (HR)
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Создание смен, отбор соискателей, согласование выплат
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">120+ Br</div>
                  <div className="text-xs text-slate-400 mt-0.5">Средняя ставка за смену</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">15 мин</div>
                  <div className="text-xs text-slate-400 mt-0.5">Среднее время отклика</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Безопасная сделка</div>
                </div>
              </div>
            </div>

            {/* Right Column: Minsk Live Preview Widget */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs text-slate-400 font-mono">карта.халти.бай</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Live радар
                  </span>
                </div>

                {/* Radar Mock Mini-View */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Ваш район: Минск, ст. м. Немига</div>
                      <div className="text-xs text-slate-400">В радиусе 15 минут пешком доступно 8 смен</div>
                    </div>
                  </div>
                </div>

                {/* 2 Hot Shifts in preview */}
                <div className="mt-4 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Кофейня</div>
                        <div className="text-sm font-semibold text-white mt-0.5">Бариста / Помощник</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          ул. Зыбицкая · 7 минут пешком
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-white">110 Br</div>
                        <div className="text-[11px] text-slate-400">09:00 – 17:00</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Ритейл</div>
                        <div className="text-sm font-semibold text-white mt-0.5">Мерчендайзер в ТРЦ Galileo</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          ул. Бобруйская, 6 · 11 минут
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-white">130 Br</div>
                        <div className="text-[11px] text-slate-400">11:00 – 19:00</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => handleQuickLogin('user')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <span>Открыть интерактивную карту Минска</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Vacancies Showcase Section */}
      <section id="vacancies" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Актуальные смены</div>
              <h2 className="text-3xl font-bold text-white">Вакансии в Минске с быстрой выплатой</h2>
              <p className="text-slate-400 text-sm mt-1">
                Все вакансии проверены: работодатель депонирует оплату до выхода на смену.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCategory === 'all' 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Все смены ({previewVacancies.length})
              </button>
              <button
                onClick={() => setFilterCategory('horeca')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCategory === 'horeca' 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Кафе и рестораны
              </button>
              <button
                onClick={() => setFilterCategory('retail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCategory === 'retail' 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Торговые сети
              </button>
              <button
                onClick={() => setFilterCategory('warehouse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCategory === 'warehouse' 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Склады и логистика
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVacancies.map((vacancy) => (
              <div 
                key={vacancy.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-black/40 group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-emerald-400 font-medium">
                      <Flame className="w-3 h-3" />
                      {vacancy.urgency}
                    </span>
                    <span className="text-slate-400">{vacancy.slots}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {vacancy.title}
                  </h3>

                  <div className="text-sm font-medium text-slate-300 mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {vacancy.company}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{vacancy.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{vacancy.schedule}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-extrabold text-emerald-400">{vacancy.pay}</div>
                    <div className="text-[11px] text-slate-400">{vacancy.payDetail}</div>
                  </div>

                  <button
                    onClick={() => handleQuickLogin('user')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-emerald-500 hover:text-black rounded-xl transition-all flex items-center gap-1.5"
                  >
                    Откликнуться
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* How it works: 3 Steps */}
      <section id="how-it-works" className="py-20 border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Простой процесс</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Как выйти на смену за 3 шага</h2>
            <p className="text-slate-400 text-sm mt-3">
              Никаких бумажных анкет и бесконечных собеседований. Всё в один клик.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center mb-4 text-lg border border-emerald-500/20">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Выберите смену на карте</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Смотрите вакансии прямо в своем районе Минска. Видно точное время, ставку в Br и расстояние пешком от вашей геолокации.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center mb-4 text-lg border border-emerald-500/20">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Откликнитесь и подтвердите</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Работодатель видит ваш профиль и принимает заявку. Все этапы отображаются в удобном статус-баре на карте.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center mb-4 text-lg border border-emerald-500/20">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Отработайте и получите оплату</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                По завершении смены администратор подтверждает часы, и выплата мгновенно зачисляется на вашу карту.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Telegram Bot Showcase */}
      <section id="telegram" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950/30 to-slate-900 border border-sky-900/40 p-8 sm:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold mb-4">
                  <Send className="w-3.5 h-3.5" />
                  Уведомления в Telegram
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Получайте горящие смены прямо в Telegram
                </h2>
                <p className="mt-4 text-slate-300 text-base leading-relaxed">
                  Подключите нашего официального бота <strong className="text-sky-300">@HaltyNotifyBot</strong> в личном кабинете. Бот мгновенно оповестит об изменении статуса отклика, напомнит о смене за 2 часа и пришлет сообщения от работодателя.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>Мгновенный пуш, когда работодатель одобрил вашу заявку</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>Новые смены в радиусе 15 минут от вашего дома</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>Подключение за 10 секунд без паролей по коду верификации</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    onClick={() => handleQuickLogin('user')}
                    className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
                  >
                    <Send className="w-4 h-4" />
                    Подключить бота в профиле
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                {/* Telegram mockup message */}
                <div className="w-full max-w-sm rounded-2xl bg-[#1e293b] border border-slate-700 p-4 shadow-xl">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                    <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs">
                      ХТ
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Халти · Оповещения</div>
                      <div className="text-xs text-sky-400">@HaltyNotifyBot · бот</div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Заявка подтверждена!
                    </div>
                    <div className="text-slate-200">
                      Кофейня «Зерно» утвердила вас на смену <strong>Бариста</strong>.
                    </div>
                    <div className="text-slate-400">
                      📍 ул. Октябрьская, 19<br />
                      ⏰ Завтра, 08:00 – 16:00<br />
                      💰 Оплата: 110 Br
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 text-right">
                    Сегодня, 14:32 · Доставлено
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Safety & Guarantees */}
      <section id="guarantees" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Проверенные работодатели</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Каждая организация проходит модерацию по УНП Республики Беларусь до публикации смен.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Депонирование средств</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Оплата за смену блокируется на счёте гаранта. Если смена отработана, деньги гарантированно ваши.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Поддержка 24/7 в Минске</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Горячая линия службы заботы: +375 (17) 200-80-90. Любые вопросы и споры решаются за 15 минут.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold text-xs">
              ХТ
            </div>
            <span className="font-semibold text-white">Халти Минск</span>
            <span>© 2026 ООО «Халти Технологии»</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#vacancies" className="hover:text-white transition-colors">Вакансии</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Правила платформы</a>
            <a href="#telegram" className="hover:text-white transition-colors">Telegram</a>
            <span className="text-slate-500">УНП 193746182</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-700 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Вход в аккаунт Халти</h3>
              <p className="text-xs text-slate-400 mt-1">
                Выберите вашу роль для входа в панель
              </p>
            </div>

            {/* Role switch tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthRole('user');
                  setAuthEmail('egor.makarov@gmail.com');
                  setAuthPassword('user123');
                  setAuthError('');
                }}
                className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
                  authRole === 'user'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Исполнитель
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthRole('employer');
                  setAuthEmail('employer@halty.by');
                  setAuthPassword('employer2026');
                  setAuthError('');
                }}
                className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
                  authRole === 'employer'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Работодатель
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthRole('admin');
                  setAuthEmail('admin@halty.by');
                  setAuthPassword('admin2026');
                  setAuthError('');
                }}
                className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
                  authRole === 'admin'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Админ
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm transition-all shadow-md shadow-emerald-500/20"
                >
                  Войти в систему
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center">
              <span className="text-xs text-slate-400">
                Быстрый вход: нажмите на тестовые аккаунты на главной странице
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
