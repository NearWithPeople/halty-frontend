import './styles.css';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, Compass, MessageCircle,
  Copy, Check, Trash2, X, Send, ShieldAlert,
  Scissors, Coffee, ShoppingBag, Truck, ArrowRight,
  MessageSquare, Navigation as NavIcon, Utensils, Fuel,
  Building2, Landmark, Trees, Footprints, Car, Bike
} from 'lucide-react';
import { StreetVacanciesHeader } from '../../StreetVacanciesHeader';
import { BottomNavPill } from '../../BottomNavPill';
import { StatusBar } from '../../StatusBar';
import { StyleSelector } from '../../StyleSelector';
import { VacancyModal } from '../../VacancyModal';
import { CompanyModal } from '../../CompanyModal';
import { UserProfileBlock } from '../../UserProfileBlock';
import { NavigationSheet, ApplicationDetailView } from '../../NavigationSheet';
import { MOCK_APPLICATIONS as INITIAL_APPLICATIONS } from '../../../mock/mockData';
import { ProfileDropdownModal } from '../../ProfileDropdownModal';
import { Button } from '../../Button';
import type { Vacancy, UserAccount } from '../../../types';

interface LibraryPageProps {
  onBackToMap?: () => void;
}

const MOCK_SAMPLE_VACANCIES: Vacancy[] = [
  {
    id: 'lib-vac-1',
    title: 'Бариста утренней смены',
    company: 'Surf Coffee® Minsk',
    salary: '85 BYN / смена',
    category: 'horeca',
    categoryLabel: 'Кофейня / Бар',
    attachmentType: 'building',
    coordinates: { lng: 27.5615, lat: 53.9045 },
    locationName: 'пр-т Независимости, 37А',
    address: 'пр-т Независимости, 37А',
    description: 'Ищем энергичного бариста для приготовления напитков. Дружная команда, бесплатный кофе, комфортный график.',
    requirements: ['Опыт с рожковой кофемашиной', 'Санкнижка', 'Пунктуальность'],
    schedule: '08:00 – 16:00 (8 ч)',
    payoutType: 'В день смены',
    color: '#f97316',
    accentColor: '#ea580c',
    iconType: 'coffee',
  },
  {
    id: 'lib-vac-2',
    title: 'Комплектовщик заказов',
    company: 'Green Гипермаркет',
    salary: '95 BYN / смена',
    category: 'retail',
    categoryLabel: 'Ритейл',
    attachmentType: 'building',
    coordinates: { lng: 27.5500, lat: 53.9100 },
    locationName: 'ул. Петра Мстиславца, 11',
    address: 'ул. Петра Мстиславца, 11 (ТЦ Dana Mall)',
    description: 'Сборка продуктовых заказов по терминалу ТСД в торговом зале гипермаркета.',
    requirements: ['Внимательность', 'Быстрый темп работы'],
    schedule: '10:00 – 19:00 (9 ч)',
    payoutType: 'В день смены',
    color: '#10b981',
    accentColor: '#059669',
    iconType: 'shopping',
  },
  {
    id: 'lib-vac-3',
    title: 'Курьер на электробайке',
    company: 'Logistics Pro Minsk',
    salary: '110 BYN / смена',
    category: 'delivery',
    categoryLabel: 'Доставка',
    attachmentType: 'ground_zone',
    coordinates: { lng: 27.5700, lat: 53.8950 },
    locationName: 'ул. Немига, 5',
    address: 'ул. Немига, 5',
    description: 'Доставка заказов из кафе центрального района. Предоставляем электровелосипед.',
    requirements: ['Уверенное вождение', 'Знание центра Минска'],
    schedule: '12:00 – 21:00 (9 ч)',
    payoutType: 'Сразу после смены',
    color: '#3b82f6',
    accentColor: '#2563eb',
    iconType: 'delivery',
  },
];


const MOCK_USER: UserAccount = {
  id: 'usr-preview',
  name: 'Егор Макаров',
  email: 'makarov.work@gmail.com',
  phone: '+375 (29) 682-14-30',
  role: 'user',
  avatar: 'ЕМ',
  rating: 4.98,
  completedShifts: 38,
  punctuality: '100%',
  tgUsername: 'egor_makarov',
  tgConnected: true,
};

export const LibraryPage: React.FC<LibraryPageProps> = ({ onBackToMap }) => {
  const [selectedCompanyModal, setSelectedCompanyModal] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Comments state persisted in localStorage
  const [comments, setComments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('halty_library_block_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('halty_library_block_comments', JSON.stringify(comments));
    } catch (e) {
      console.warn('Cannot save comments:', e);
    }
  }, [comments]);

  const handleUpdateComment = (id: string, text: string) => {
    setComments((prev) => ({
      ...prev,
      [id]: text,
    }));
  };

  const handleClearAllComments = () => {
    if (window.confirm('Сбросить все введённые комментарии?')) {
      setComments({});
    }
  };

  const activeCommentsCount = Object.values(comments).filter((c) => c && c.trim().length > 0).length;

  const generateConsolidatedPrompt = () => {
    const filled = Object.entries(comments).filter(([_, text]) => text && text.trim().length > 0);
    if (filled.length === 0) {
      return 'Пока нет комментариев. Введите правки в поля комментариев рядом с нужными блоками на странице.';
    }

    let out = 'Привет! Вот сводный список правок по дизайну приложения Halty. Пожалуйста, внедри следующие изменения строго в соответствии с дизайн-кодом (лаконичность, глубокий цвет #181D38, "пухленькие" скругления 32px-36px, чистые белые карточки без визуального шума):\n\n';

    filled.forEach(([blockId, text]) => {
      out += `### Блок: [${blockId}]\n${text.trim()}\n\n`;
    });

    out += '---\nПожалуйста, обнови компоненты и сохрани чистоту и аккуратность интерфейса.';
    return out;
  };

  const handleCopyAiPrompt = () => {
    const text = generateConsolidatedPrompt();
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);
  };

  const handleCopyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Reusable Comment Card Component
  const renderCommentBox = (
    blockId: string,
    blockTitle: string,
    quickTags: string[] = ['Шрифт крупнее', 'Пухлее скругления', 'Сделать лаконичнее', 'Убрать лишнее']
  ) => {
    const currentVal = comments[blockId] || '';
    const hasComment = currentVal.trim().length > 0;

    return (
      <div className="mt-4 p-5 rounded-[28px] bg-white border-2 border-slate-100 shadow-[0_10px_30px_rgba(24,29,56,0.04)] text-[#181D38] transition-all">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#181D38] text-white flex items-center justify-center text-[10px] font-black">
              ✏️
            </span>
            <span className="text-xs font-black tracking-tight text-[#181D38]">
              Правки к блоку: <strong className="text-blue-600">{blockTitle}</strong>
            </span>
          </div>

          {hasComment && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
              ✓ Правка добавлена
            </span>
          )}
        </div>

        {/* Quick Tag Chips */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {quickTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const updated = currentVal ? `${currentVal}. ${tag}` : tag;
                handleUpdateComment(blockId, updated);
              }}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#181D38] hover:text-white text-[#181D38] transition-colors cursor-pointer"
            >
              + {tag}
            </button>
          ))}
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            rows={2}
            value={currentVal}
            onChange={(e) => handleUpdateComment(blockId, e.target.value)}
            placeholder="Опишите, что поправить в этом блоке (шрифты, отступы, кнопки, цвет, структура)..."
            className="w-full p-3 rounded-[20px] bg-slate-50 border border-slate-200/80 text-xs font-medium text-[#181D38] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#181D38] focus:bg-white transition-all resize-none"
          />

          {hasComment && (
            <button
              type="button"
              onClick={() => handleUpdateComment(blockId, '')}
              className="absolute right-2.5 bottom-3 p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
              title="Очистить комментарий"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden bg-[#F6F7FB] text-[#181D38] font-sans selection:bg-[#181D38] selection:text-white z-[9999] isolate pb-40">
      
      {/* ─── Top Floating Pill Navigation Header ──────────────────── */}
      <header className="sticky top-4 z-50 max-w-6xl mx-auto px-4">
        <div className="bg-white/90 backdrop-blur-2xl rounded-full border border-slate-200/80 shadow-[0_12px_40px_rgba(24,29,56,0.08)] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToMap && (
              <button
                onClick={onBackToMap}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-[#181D38] hover:text-white text-[#181D38] text-xs font-black transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Карта</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#181D38] animate-pulse" />
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[#181D38]">
                Halty Design Code
              </h1>
            </div>
          </div>

          {/* Centered Segment Indicator from Screenshot */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100">
            <div className="w-7 h-2 rounded-full bg-[#181D38]" />
            <div className="w-3 h-2 rounded-full bg-slate-300" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPageLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-[#181D38] text-xs font-bold transition-all cursor-pointer"
              title="Скопировать ссылку для Figma html.to.design"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedUrl ? 'Скопировано' : 'Figma Link'}</span>
            </button>

            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Правки для ИИ</span>
              {activeCommentsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-400 text-[#181D38] text-[10px] font-black flex items-center justify-center">
                  {activeCommentsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Showcase Banner (Style from uploaded image) ────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="p-8 sm:p-12 rounded-[36px] bg-white border border-slate-100 shadow-[0_20px_60px_rgba(24,29,56,0.05)] text-center max-w-3xl mx-auto">
          {/* Main Title matching Screenshot */}
          <h2 className="text-3xl sm:text-5xl font-black text-[#181D38] tracking-tight leading-tight">
            Понятная безопасность
          </h2>

        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-16">
        <section id="section-tokens" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">00 / Foundation Tokens</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Цвета, Пастели и Бейджи</h3>
          </div>

          <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.04)] space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[
                { label: 'Deep Ink Navy', hex: '#181D38', bg: 'bg-[#181D38]', text: 'text-white' },
                { label: 'Warm Soft Surface', hex: '#F6F7FB', bg: 'bg-[#F6F7FB]', text: 'text-slate-900 border border-slate-200' },
                { label: 'Soft Peach (HoReCa)', hex: '#FFF2EB', bg: 'bg-[#FFF2EB] border border-orange-200', text: 'text-orange-950' },
                { label: 'Mint Pastel (Retail)', hex: '#ECFDF5', bg: 'bg-[#ECFDF5] border border-emerald-200', text: 'text-emerald-950' },
                { label: 'Soft Lavender (Delivery)', hex: '#EEF2FF', bg: 'bg-[#EEF2FF] border border-indigo-200', text: 'text-indigo-950' },
                { label: 'Soft Butter (Rating)', hex: '#FEF9C3', bg: 'bg-[#FEF9C3] border border-amber-200', text: 'text-amber-950' },
              ].map((c, i) => (
                <div key={i} className="p-3.5 rounded-[22px] bg-slate-50 border border-slate-100">
                  <div className={`h-10 w-full rounded-[14px] ${c.bg} mb-2 shadow-xs`} />
                  <span className="text-xs font-black text-[#181D38] block truncate">{c.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">{c.hex}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-4 py-2 rounded-full bg-[#181D38] text-white text-xs font-extrabold flex items-center gap-2">
                <span>Базовый стиль Halty</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              <span className="px-4 py-2 rounded-full bg-[#FFF2EB] text-orange-900 border border-orange-200 text-xs font-extrabold flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-orange-600" />
                Кофейня / Бар
              </span>
              <span className="px-4 py-2 rounded-full bg-[#ECFDF5] text-emerald-900 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                Ритейл
              </span>
              <span className="px-4 py-2 rounded-full bg-[#EEF2FF] text-indigo-900 border border-indigo-200 text-xs font-extrabold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                Доставка
              </span>
            </div>
          </div>

          {renderCommentBox('00_foundation_tokens', 'Цвета и бейджи (Foundation)', [
            'Сделать цвет текста более темным',
            'Увеличить скругления до 36px',
            'Добавить пастельные фоны',
          ])}
        </section>

        {/* 01: STREET VACANCIES HEADER */}
        <section id="section-headers" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">01 / Top Bars</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Шапка улицы со счетчиком вакансий</h3>
          </div>

          <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.04)] flex flex-wrap justify-center gap-6">
            <StreetVacanciesHeader streetName="Сквер Адама Міцкевіча" vacanciesCount={12} onOpenList={() => {}} />
            <StreetVacanciesHeader streetName="пр-т Независимости, 37А" vacanciesCount={5} onOpenList={() => {}} />
          </div>

          {renderCommentBox('01_street_header', 'Шапка улицы (StreetVacanciesHeader)', [
            'Сделать компактнее по высоте',
            'Изменить цвет шрифта на #181D38',
            'Пухлее форма плашки (rounded-full)',
          ])}
        </section>

        {/* 02: BOTTOM NAVIGATION PILL */}
        <section id="section-bottom-pill" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">02 / Menus</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Нижний навигационный бар (BottomNavPill)</h3>
          </div>

          <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.04)] grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-slate-400 block">Вкладка: Карта</span>
              <div className="p-4 bg-[#F6F7FB] rounded-[26px] flex justify-center">
                <BottomNavPill activeTab="map" onTabChange={() => {}} applicationsBadge={3} chatsBadge={1} isStatic={true} />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-slate-400 block">Вкладка: Отклики с бейджем</span>
              <div className="p-4 bg-[#F6F7FB] rounded-[26px] flex justify-center">
                <BottomNavPill activeTab="applications" onTabChange={() => {}} applicationsBadge={5} chatsBadge={1} isStatic={true} />
              </div>
            </div>
          </div>

          {renderCommentBox('02_bottom_nav_pill', 'Нижний бар (BottomNavPill)', [
            'Сделать иконки жирнее',
            'Увеличить активный кружок',
            'Добавить подписи к иконкам',
          ])}
        </section>

        {/* 03: CONTROLS & FLOATS */}
        <section id="section-controls" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">03 / Controls</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Кнопки карты, Зум и Статус-бар</h3>
          </div>

          <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.04)] grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buttons with 4th Lasso Button */}
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-slate-400 block">Зум-бар (4 кнопки) с лассо</span>
              <div className="p-4 bg-[#F6F7FB] rounded-[26px] flex justify-center gap-4">
                <div className="flex flex-col gap-1.5 bg-white p-1.5 rounded-full shadow-md border border-slate-200/90">
                  <Button variant="round" className="font-bold" title="Приблизить">+</Button>
                  <Button variant="round" className="font-bold" title="Отдалить">−</Button>
                  <Button variant="round" title="Моё местоположение"><Compass className="w-4 h-4" /></Button>
                  <Button variant="roundActive" title="Выделение области (Лассо)"><Scissors className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-slate-400 block">Координаты и масштаб</span>
              <div className="p-4 bg-[#F6F7FB] rounded-[26px] flex flex-col items-center justify-center gap-3 h-full">
                <StatusBar coordinates={{ lat: 53.9045, lng: 27.5615 }} zoom={14.5} styleName="Стандартный" />
              </div>
            </div>

            {/* Style Selector */}
            <div className="space-y-2 text-center">
              <span className="text-xs font-bold text-slate-400 block">Селектор слоев карты</span>
              <div className="p-4 bg-[#F6F7FB] rounded-[26px] flex justify-center">
                <StyleSelector currentStyleId="streets" onSelectStyle={() => {}} onClose={() => {}} isStatic={true} />
              </div>
            </div>
          </div>

          {renderCommentBox('03_map_controls', 'Кнопки управления (NavigationControls & StatusBar)', [
            'Сделать кнопки зума круглыми',
            'Сделать иконку геолокации в стиле кнопки "Далее"',
          ])}
        </section>

        {/* 04: SPATIAL MAP MARKERS & CLUSTERS */}
        <section id="section-markers" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">04 / Map Pins</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Маркеры на карте и пухлые кластеры</h3>
          </div>

          <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.04)] grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2 p-4 bg-[#F6F7FB] rounded-[26px]">
              <div className="w-12 h-12 rounded-full bg-[#181D38] text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Coffee className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-[#181D38]">Кофейня</span>
              <span className="text-[11px] text-slate-500 font-bold">85 BYN</span>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 bg-[#F6F7FB] rounded-[26px]">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-[#181D38]">Ритейл</span>
              <span className="text-[11px] text-slate-500 font-bold">95 BYN</span>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 bg-[#F6F7FB] rounded-[26px]">
              <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-xs font-black text-[#181D38]">Доставка</span>
              <span className="text-[11px] text-slate-500 font-bold">110 BYN</span>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 bg-[#F6F7FB] rounded-[26px]">
              <div className="w-12 h-12 rounded-full bg-[#181D38] text-white flex items-center justify-center font-black text-sm shadow-xl border-2 border-white">
                +14
              </div>
              <span className="text-xs font-black text-[#181D38]">Кластер</span>
              <span className="text-[11px] text-slate-500 font-bold">14 смен</span>
            </div>
          </div>

          {renderCommentBox('04_map_markers', 'Маркеры карты (Pins & Clusters)', [
            'Сделать форму капли пухлее',
            'Добавить постоянный ценник над маркером',
          ])}
        </section>

        {/* 05: VACANCY CARDS */}
        <section id="section-cards" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">05 / Cards</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Карточки вакансий в ленте</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_SAMPLE_VACANCIES.map((vac) => (
              <div
                key={vac.id}
                className="bg-white rounded-[32px] p-6 shadow-[0_15px_40px_rgba(24,29,56,0.05)] border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-[#181D38]">
                      {vac.categoryLabel}
                    </span>
                    <span className="text-xs font-extrabold text-[#181D38]">{vac.salary}</span>
                  </div>

                  <h4 className="text-base font-black text-[#181D38] leading-snug">{vac.title}</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">{vac.company} • {vac.locationName}</p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed font-medium">
                    {vac.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 py-3.5 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Откликнуться</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyModal(vac.company)}
                    className="px-4 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#181D38] text-xs font-bold cursor-pointer"
                  >
                    О фирме
                  </button>
                </div>
              </div>
            ))}
          </div>

          {renderCommentBox('05_vacancy_cards', 'Карточки вакансий (Vacancy Cards)', [
            'Кнопка в стиле "Далее →" из дизайн-кода',
            'Сделать плашку зарплаты более контрастной',
          ])}
        </section>

        {/* 06: VACANCY MODAL */}
        <section id="section-vacancy-modal" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">06 / Modal</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Всплывающая плашка вакансии над картой</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] flex flex-wrap justify-center gap-8">
            <div className="w-full max-w-sm flex justify-center">
              <VacancyModal
                vacancy={MOCK_SAMPLE_VACANCIES[0]}
                onClose={() => {}}
                onApply={() => {}}
                isApplied={false}
                onOpenCompany={(company) => setSelectedCompanyModal(company)}
                isStatic={true}
              />
            </div>

            <div className="w-full max-w-sm flex justify-center">
              <VacancyModal
                vacancy={MOCK_SAMPLE_VACANCIES[1]}
                onClose={() => {}}
                onApply={() => {}}
                isApplied={true}
                onOpenCompany={(company) => setSelectedCompanyModal(company)}
                isStatic={true}
              />
            </div>
          </div>

          {renderCommentBox('06_vacancy_modal', 'Всплывающее окно вакансии (VacancyModal)', [
            'Скруглить углы карточки до 36px',
            'Сделать главную кнопку "Далее →"',
          ])}
        </section>

        {/* 07: COMPANY PROFILE BLOCK */}
        <section id="section-company" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">07 / Company Block</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Блок «О компании» (Карточка и модалка)</h3>
          </div>

          <div className="flex justify-center p-6 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)]">
            <CompanyModal
              isStandalone={true}
              companyName="Surf Coffee® Minsk"
              vacancies={MOCK_SAMPLE_VACANCIES}
              onApplyVacancy={() => {}}
            />
          </div>

          {renderCommentBox('07_company_modal', 'Блок «О компании» (CompanyModal)', [
            'Сделать аватарку компании скругленной 28px',
            'Добавить плашку проверенного работодателя в синем стиле #181D38',
          ])}
        </section>

        {/* 08: WORKER PROFILE WITH REVIEWS & RATINGS */}
        <section id="section-profile" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">08 / Personal Profile</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Личный профиль с отзывами и рейтингами</h3>
          </div>

          <div className="p-6 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)]">
            <UserProfileBlock currentUser={MOCK_USER} isStandalone={true} />
          </div>

          {renderCommentBox('08_user_profile', 'Личный профиль соискателя (UserProfileBlock)', [
            'Сделать индикатор рейтинга в стиле бегунка из скрина',
            'Кнопки табов сделать пухлыми пиллами',
          ])}
        </section>

        {/* 09: WORKFLOW TRACKER */}
        <section id="section-workflow" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">09 / Tracker</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Трекер этапов отклика (5 шагов)</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#181D38] bg-slate-100 px-3 py-1 rounded-full">
                  Этап 3 из 5 • Смена назначена
                </span>
                <h4 className="text-base font-black text-[#181D38] mt-2">Бариста утренней смены — Surf Coffee</h4>
              </div>
              <span className="text-base font-black text-[#181D38]">85 BYN</span>
            </div>

            {/* Progress Pills */}
            <div className="grid grid-cols-5 gap-2 text-center my-6">
              {[
                { step: 1, label: 'Отклик', done: true },
                { step: 2, label: 'Одобрен', done: true },
                { step: 3, label: 'Назначен', current: true },
                { step: 4, label: 'На смене', pending: true },
                { step: 5, label: 'Оплачено', pending: true },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
                      s.done
                        ? 'bg-[#181D38] text-white'
                        : s.current
                        ? 'bg-[#181D38] text-white ring-4 ring-slate-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {s.done ? '✓' : s.step}
                  </div>
                  <span className="text-[10px] font-bold text-[#181D38]">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#F6F7FB] rounded-[24px] p-4 text-xs text-[#181D38] flex items-center justify-between">
              <span className="font-bold">📍 Ждем вас к 08:00 по адресу пр-т Независимости 37А</span>
              <button className="px-4 py-2 bg-[#181D38] text-white text-xs font-black rounded-full cursor-pointer">
                Маршрут
              </button>
            </div>
          </div>

          {renderCommentBox('09_workflow_tracker', 'Трекер статусов отклика (Workflow Tracker)', [
            'Сделать индикатор шагов как на скриншоте (полоски)',
            'Кнопка "Маршрут" круглая и пухлая',
          ])}
        </section>



        {/* 12: EMERGENCY SOS PROTECTION */}
        <section id="section-sos" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest">12 / SOS Protection</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Экстренная защита и сообщение СОС (SOS)</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] flex flex-wrap items-center justify-center gap-8">
            <button
              type="button"
              className="px-6 py-4 rounded-full bg-rose-600 text-white font-black text-sm flex items-center gap-2.5 shadow-xl active:scale-95 cursor-pointer"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>SOS Экстренная защита</span>
            </button>

            <div className="w-full max-w-md bg-[#F6F7FB] rounded-[32px] p-6 text-[#181D38] space-y-4 border border-rose-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black">Экстренная защита</h4>
                  <p className="text-[11px] text-rose-600 font-bold uppercase">Поддержка 24/7</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Если условия смены нарушены или задерживается оплата — куратор подключится за 2 минуты и гарантирует 100% компенсацию.
              </p>

              <button
                type="button"
                className="w-full py-4 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Написать куратору смены (Ответ за 2 мин)</span>
              </button>
            </div>
          </div>

          {renderCommentBox('12_emergency_sos', 'Экстренная защита (SOS Modal)', [
            'Кнопка вызова куратора пухлая rounded-full',
            'Сделать текст лаконичнее',
          ])}
        </section>

        {/* 13: CHATS & MESSENGER */}
        <section id="section-chat" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">13 / Messenger</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Чат со сменой и диалоги</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#F6F7FB] rounded-[28px] p-4 space-y-3">
              <h4 className="text-xs font-black text-[#181D38] uppercase">Диалоги со сменами</h4>
              {[
                { name: 'Surf Coffee® Minsk', msg: 'Форму выдадим на месте...', time: '14:35', active: true },
                { name: 'Logistics Pro Minsk', msg: 'Смена подтверждена на завтра', time: 'Вчера', active: false },
              ].map((c, i) => (
                <div key={i} className={`p-3.5 rounded-[22px] flex items-center justify-between cursor-pointer ${c.active ? 'bg-white shadow-sm' : 'bg-transparent hover:bg-white/60'}`}>
                  <div>
                    <h5 className="text-xs font-black text-[#181D38]">{c.name}</h5>
                    <p className="text-[11px] text-slate-500 font-medium">{c.msg}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{c.time}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-7 bg-[#F6F7FB] rounded-[28px] p-5 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-[#181D38] text-white text-xs font-black flex items-center justify-center">
                    SC
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#181D38]">Surf Coffee® Minsk</h5>
                    <p className="text-[10px] text-emerald-600 font-bold">Куратор онлайн</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-white p-3.5 rounded-[22px] rounded-tl-xs text-xs text-[#181D38] max-w-[85%] shadow-2xs font-medium">
                    Здравствуйте! Вы назначены на смену 9 июня к 08:00 по адресу пр-т Независимости 37А.
                  </div>
                  <div className="bg-[#181D38] text-white p-3.5 rounded-[22px] rounded-tr-xs text-xs max-w-[85%] ml-auto font-medium shadow-md">
                    Доброе утро! Все понял, буду вовремя.
                  </div>
                </div>
              </div>

              <div className="mt-4 p-1.5 bg-white rounded-full flex items-center gap-2 border border-slate-200">
                <input
                  type="text"
                  placeholder="Написать сообщение..."
                  defaultValue="Спасибо!"
                  className="flex-1 pl-4 text-xs font-bold text-[#181D38] focus:outline-none"
                />
                <button className="w-10 h-10 rounded-full bg-[#181D38] text-white flex items-center justify-center cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {renderCommentBox('13_chat_messenger', 'Чат со сменой (Messenger)', [
            'Скруглить облачка сообщений до 24px',
            'Сделать кнопку отправки круглой в стиле #181D38',
          ])}
        </section>

        {/* 14: VACANCY DRAWER PANE */}
        <section id="section-vacancies-list" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">14 / Vacancies Drawer</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Список вакансий с поиском и фильтрами</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-2 bg-[#F6F7FB] rounded-full p-2">
              <Search className="w-4 h-4 text-slate-400 ml-2" />
              <input
                type="text"
                placeholder="Поиск вакансий в Минске..."
                defaultValue="Бариста"
                className="w-full bg-transparent text-xs font-bold text-[#181D38] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['Все (18)', 'Кофейни (6)', 'Склад (5)', 'Курьеры (4)'].map((c, i) => (
                <button
                  key={i}
                  className={`px-4 py-2 rounded-full text-xs font-black shrink-0 transition-colors cursor-pointer ${
                    i === 0 ? 'bg-[#181D38] text-white' : 'bg-[#F6F7FB] text-[#181D38]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {MOCK_SAMPLE_VACANCIES.map((vac) => (
                <div key={vac.id} className="p-4 rounded-[26px] bg-[#F6F7FB] flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-black text-[#181D38]">{vac.title}</h5>
                    <p className="text-[11px] text-slate-500 font-bold">{vac.salary} • {vac.company}</p>
                  </div>
                  <button className="px-4 py-2 rounded-full bg-[#181D38] text-white text-xs font-black">
                    Отклик
                  </button>
                </div>
              ))}
            </div>
          </div>

          {renderCommentBox('14_vacancies_drawer', 'Панель списка вакансий (Drawer Jobs)', [
            'Поле поиска скругленное rounded-full',
            'Фильтр-чипы сделать пухлыми пиллами',
          ])}
        </section>

        {/* 15: SETTINGS & ACCOUNT */}
        <section id="section-settings" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">15 / Settings</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Настройки и Telegram-бот</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#F6F7FB] rounded-[28px] p-5 space-y-3">
              <h4 className="text-xs font-black text-[#181D38] uppercase">Системные переключатели</h4>
              {['Push-уведомления о сменах', 'Звуковые сигналы', 'Выплаты сразу на карту'].map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-[20px] bg-white">
                  <span className="text-xs font-bold text-[#181D38]">{t}</span>
                  <div className="w-10 h-6 rounded-full bg-[#181D38] flex items-center justify-end p-0.5">
                    <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#F6F7FB] rounded-[28px] p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#181D38] uppercase">Telegram-бот</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                    Подключен
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                  Бот присылает подтверждения смен за 1 час до выхода и моментальные чеки о зачислении средств.
                </p>
              </div>

              <button className="w-full py-3.5 rounded-full bg-[#181D38] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer">
                <span>Тестовое уведомление</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {renderCommentBox('15_settings_account', 'Настройки и интеграции (Settings)', [
            'Тумблеры в темном цвете #181D38',
            'Кнопка Telegram в стиле "Далее →"',
          ])}
        </section>

        {/* 16: SEARCHBAR & AUTOCOMPLETE */}
        <section id="section-search" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">16 / Search</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Строка поиска с быстрыми категориями</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-2 bg-[#F6F7FB] rounded-full p-2 border border-slate-200">
              <Search className="w-4 h-4 text-slate-400 ml-3" />
              <input
                type="text"
                placeholder="Поиск мест, улиц и заведений в Минске..."
                defaultValue="Кофейня на площади"
                className="w-full bg-transparent text-xs font-bold text-[#181D38] focus:outline-none"
              />
              <button className="w-9 h-9 rounded-full bg-[#181D38] text-white flex items-center justify-center cursor-pointer">
                <NavIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'Кафе', icon: Coffee },
                { label: 'Еда', icon: Utensils },
                { label: 'АЗС', icon: Fuel },
                { label: 'Отели', icon: Building2 },
                { label: 'Музеи', icon: Landmark },
                { label: 'Парки', icon: Trees },
              ].map((c, idx) => {
                const Icon = c.icon;
                return (
                  <button
                    key={idx}
                    className="p-3 rounded-[22px] bg-[#F6F7FB] hover:bg-[#181D38] hover:text-white flex flex-col items-center gap-1 transition-all cursor-pointer group"
                  >
                    <Icon className="w-4 h-4 text-[#181D38] group-hover:text-white" />
                    <span className="text-[10px] font-extrabold">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {renderCommentBox('16_search_bar', 'Панель поиска (SearchBar)', [
            'Строка поиска пухлая rounded-full',
            'Кнопки категорий скругленные 22px',
          ])}
        </section>

        {/* 17: DIRECTIONS & ROUTE */}
        <section id="section-directions" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">17 / Navigation</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Построение маршрута до смены</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] max-w-xl mx-auto space-y-4">
            <div className="flex gap-2 p-1.5 bg-[#F6F7FB] rounded-full">
              {[
                { label: 'Пешком (28 мин)', active: true, icon: Footprints },
                { label: 'Авто (12 мин)', active: false, icon: Car },
                { label: 'Вело (16 мин)', active: false, icon: Bike },
              ].map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={i}
                    className={`flex-1 py-2 rounded-full text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                      p.active ? 'bg-[#181D38] text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-[26px] bg-[#F6F7FB] text-xs font-bold text-[#181D38] space-y-1">
              <span>Дистанция: 2.4 км • Время: 28 минут</span>
              <p className="text-slate-500 text-[11px] font-medium">Маршрут пролегает через сквер и пр-т Независимости</p>
            </div>
          </div>

          {renderCommentBox('17_directions_panel', 'Построение маршрута (DirectionsPanel)', [
            'Кнопки транспорта в стиле пухлых пиллов',
          ])}
        </section>

        {/* 18: ADMIN CREATE VACANCY */}
        <section id="section-admin-create" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">18 / Admin Create</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Модальное окно создания вакансии АДМИНОМ</h3>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] max-w-xl mx-auto space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Должность смены</label>
              <input
                type="text"
                defaultValue="Бариста на праздник города"
                className="w-full px-4 py-3 rounded-full bg-[#F6F7FB] text-xs font-extrabold text-[#181D38] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Компания</label>
                <input
                  type="text"
                  defaultValue="Surf Coffee® Minsk"
                  className="w-full px-4 py-3 rounded-full bg-[#F6F7FB] text-xs font-extrabold text-[#181D38] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Ставка (BYN)</label>
                <input
                  type="text"
                  defaultValue="95 BYN / смена"
                  className="w-full px-4 py-3 rounded-full bg-[#F6F7FB] text-xs font-extrabold text-[#181D38] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              className="w-full py-4 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Опубликовать смену на карте</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {renderCommentBox('18_admin_create_modal', 'Форма создания смены (CreateVacancyModal)', [
            'Все поля ввода скругленные rounded-full',
            'Кнопка "Опубликовать" в стиле "Далее →"',
          ])}
        </section>

        {/* 19: APPLICATION DETAILS (ДЕТАЛИ ОТКЛИКА) */}
        <section id="section-app-details" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">19 / Application Detail</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">Детали отклика соискателя (ApplicationDetailView)</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Экран детального просмотра отклика со встроенной интерактивной мини-картой, 5-шаговым трекером прогресса, кнопкой SOS, решением АДМИНА и переходом в чат.
            </p>
          </div>

          <div className="p-8 rounded-[36px] bg-white border border-slate-100 shadow-[0_15px_40px_rgba(24,29,56,0.05)] grid grid-cols-1 lg:grid-cols-2 gap-8 justify-items-center">
            {/* Worker View: Active Shift with 4th stage reached */}
            <div className="w-full max-w-[420px] h-[720px] rounded-[32px] overflow-hidden border border-slate-200 shadow-xl flex flex-col bg-white">
              <div className="bg-[#181D38] text-white px-4 py-2 text-[11px] font-extrabold flex items-center justify-between">
                <span>Режим Соискателя (Смена подтверждена)</span>
                <span className="text-emerald-400 font-black">Этап 4 / 5</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ApplicationDetailView
                  app={INITIAL_APPLICATIONS[0]}
                  userCoords={{ lng: 27.4475, lat: 53.8614 }}
                  onBack={() => {}}
                  onClose={() => {}}
                  onCancel={() => {}}
                  onAdvance={() => {}}
                  userRole="user"
                  onUpdate={() => {}}
                />
              </div>
            </div>

            {/* Admin Decision View: Pending Shift waiting for employer approval */}
            <div className="w-full max-w-[420px] h-[720px] rounded-[32px] overflow-hidden border border-purple-200 shadow-xl flex flex-col bg-white">
              <div className="bg-purple-900 text-white px-4 py-2 text-[11px] font-extrabold flex items-center justify-between">
                <span>Режим АДМИНА (Принятие решения по кандидату)</span>
                <span className="text-amber-300 font-black">Ожидает решения</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ApplicationDetailView
                  app={INITIAL_APPLICATIONS[1]}
                  userCoords={{ lng: 27.5518, lat: 53.8906 }}
                  onBack={() => {}}
                  onClose={() => {}}
                  onCancel={() => {}}
                  onAdvance={() => {}}
                  onApprove={() => {}}
                  onReject={() => {}}
                  userRole="admin"
                  onUpdate={() => {}}
                />
              </div>
            </div>
          </div>

          {renderCommentBox('19_application_detail', 'Детали отклика (ApplicationDetailView)', [
            'Сделать индикатор 5 шагов в виде пухлых пиллов',
            'Кнопки "Одобрить" и "Отказать" скругленные 24px',
            'Мини-карту сделать со скруглением 28px',
          ])}
        </section>

        {/* 20: APPLICANT PROFILE DROPDOWN (ПРОФИЛЬ СОИСКАТЕЛЯ СО ВСЕМИ ПОДМЕНЮ) */}
        <section id="section-profile-dropdown" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">20 / Profile Menu & Subviews</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">
              Профиль соискателя (тапом по аватарке) со всеми подменю
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Главное меню профиля соискателя и работодателя (АДМИН), а также все внутренние экраны: Резюме, Документы, Статистика, Редактирование, Служба заботы и Telegram-уведомления.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Subview 1: Главное меню профиля соискателя */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">1. Главное меню соискателя</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">Тап по аватарке</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="menu"
                  onClose={() => {}}
                  currentUser={MOCK_USER}
                  onLogout={() => {}}
                />
              </div>
            </div>

            {/* Subview 2: Моё резюме */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">2. Подменю: Моё резюме</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Анкета соискателя</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="resume"
                  onClose={() => {}}
                  currentUser={MOCK_USER}
                  onLogout={() => {}}
                />
              </div>
            </div>

            {/* Subview 3: Документы */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">3. Подменю: Документы</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Паспорт, Санкнижка</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="docs"
                  onClose={() => {}}
                  currentUser={MOCK_USER}
                  onLogout={() => {}}
                />
              </div>
            </div>

            {/* Subview 4: Статистика соискателя */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">4. Подменю: Статистика соискателя</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">4.9 ★, 100% надёжность</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="stats"
                  onClose={() => {}}
                  currentUser={MOCK_USER}
                  onLogout={() => {}}
                />
              </div>
            </div>

            {/* Subview 5: Telegram-бот */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">5. Подменю: Telegram-уведомления</span>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">@HaltyNotifyBot</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="telegram"
                  onClose={() => {}}
                  currentUser={MOCK_USER}
                  onLogout={() => {}}
                />
              </div>
            </div>

            {/* Subview 6: Режим АДМИН (Организация, Юр. данные и УНП) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black text-[#181D38]">6. Режим АДМИН: Юр. данные и ЕГР</span>
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">УНП 193746182</span>
              </div>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <ProfileDropdownModal
                  isOpen={true}
                  isStatic={true}
                  initialSubView="company_legal"
                  onClose={() => {}}
                  currentUser={{
                    ...MOCK_USER,
                    role: 'admin',
                    companyName: 'ООО «Халти Технологии»',
                    avatar: 'АД',
                  }}
                  onLogout={() => {}}
                />
              </div>
            </div>
          </div>

          {renderCommentBox('20_applicant_profile_dropdown', 'Профиль соискателя и подменю (ProfileDropdownModal)', [
            'Аватарка и бейджи в глубоком темно-синем #181D38',
            'Пухлые пункты списка скруглением 24px',
            'Кнопка "Сохранить" в стиле "Далее →"',
          ])}
        </section>

        {/* 21: FULL NAVIGATION DRAWER (ОТКЛИКИ, ЧАТЫ, ИЗБРАННОЕ) */}
        <section id="section-navigation-sheet-full" className="space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">21 / App Drawer Full</span>
            <h3 className="text-2xl font-black text-[#181D38] tracking-tight">
              Интерфейсные панели приложения (NavigationSheet)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Реальные экраны боковой панели: список откликов, чаты смен и избранные вакансии.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-black text-[#181D38] px-3 block">1. Вкладка «Отклики»</span>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <NavigationSheet
                  activeTab="applications"
                  vacancies={MOCK_SAMPLE_VACANCIES}
                  applications={INITIAL_APPLICATIONS}
                  onClose={() => {}}
                  onSelectVacancy={() => {}}
                  onUpdateApplication={() => {}}
                  onCancelApplication={() => {}}
                  onAdvanceStage={() => {}}
                  isStatic={true}
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-[#181D38] px-3 block">2. Вкладка «Диалоги со сменами»</span>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <NavigationSheet
                  activeTab="chats"
                  vacancies={MOCK_SAMPLE_VACANCIES}
                  applications={INITIAL_APPLICATIONS}
                  onClose={() => {}}
                  onSelectVacancy={() => {}}
                  onUpdateApplication={() => {}}
                  onCancelApplication={() => {}}
                  onAdvanceStage={() => {}}
                  isStatic={true}
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-[#181D38] px-3 block">3. Вкладка «Избранное»</span>
              <div className="p-4 rounded-[36px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(24,29,56,0.06)] flex justify-center">
                <NavigationSheet
                  activeTab="favorites"
                  vacancies={MOCK_SAMPLE_VACANCIES}
                  applications={INITIAL_APPLICATIONS}
                  onClose={() => {}}
                  onSelectVacancy={() => {}}
                  onUpdateApplication={() => {}}
                  onCancelApplication={() => {}}
                  onAdvanceStage={() => {}}
                  isStatic={true}
                />
              </div>
            </div>
          </div>

          {renderCommentBox('21_navigation_sheet_full', 'Интерфейсные панели приложения (NavigationSheet)', [
            'Пухлые скругления для всех карточек списков',
            'Акцентные бейджи статусов в едином стиле',
          ])}
        </section>

      </main>

      {/* ─── Sticky Bottom Action Bar to Open Consolidated Comments ─ */}
      <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto bg-[#181D38] text-white rounded-full shadow-[0_20px_60px_rgba(24,29,56,0.35)] border border-white/20 p-2 sm:p-2.5 flex items-center gap-3">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#181D38] font-black text-xs sm:text-sm hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-[#181D38]" />
            <span>Собрать все правки для ИИ</span>
            <span className="w-6 h-6 rounded-full bg-[#181D38] text-white text-[11px] font-black flex items-center justify-center">
              {activeCommentsCount}
            </span>
          </button>

          {activeCommentsCount > 0 && (
            <button
              onClick={handleClearAllComments}
              className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Сбросить все правки"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Modal: Consolidated Comments for AI Prompt ───────────── */}
      {isAiModalOpen && (
        <div
          onClick={() => setIsAiModalOpen(false)}
          className="fixed inset-0 z-[10000] bg-[#181D38]/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden text-[#181D38] space-y-4 p-6 sm:p-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#181D38] text-white flex items-center justify-center font-bold">
                  🤖
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#181D38] leading-tight">Сводные правки для ИИ</h3>
                  <p className="text-xs text-slate-500 font-medium">Готовый промпт для отправки в чат с ассистентом</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Generated Prompt Preview Box */}
            <div className="relative">
              <textarea
                readOnly
                rows={12}
                value={generateConsolidatedPrompt()}
                className="w-full p-4 rounded-[24px] bg-[#F6F7FB] border border-slate-200 text-xs font-mono text-[#181D38] leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs font-bold text-slate-500">
                Заполнено блоков: <strong className="text-[#181D38]">{activeCommentsCount}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAiPrompt}
                  className="px-6 py-3.5 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Скопировано в буфер!' : 'Скопировать для ИИ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Company Modal Overlay (if clicked) ──────── */}
      {selectedCompanyModal && (
        <CompanyModal
          isOpen={true}
          companyName={selectedCompanyModal}
          vacancies={MOCK_SAMPLE_VACANCIES}
          onClose={() => setSelectedCompanyModal(null)}
          onApplyVacancy={() => setSelectedCompanyModal(null)}
        />
      )}
    </div>
  );
};

export default LibraryPage;
