import './styles.css';
import React, { useState } from 'react';
import {
  Star, ShieldCheck, CheckCircle2, Award, Clock,
  FileCheck, Sparkles, TrendingUp
} from 'lucide-react';
import type { UserAccount } from '../../types';

export interface UserReview {
  id: string;
  companyName: string;
  companyLogo: string;
  reviewerName: string;
  reviewerRole: string;
  rating: number;
  date: string;
  shiftTitle: string;
  comment: string;
  earned: string;
  badgesGiven: string[];
}

export const MOCK_USER_REVIEWS: UserReview[] = [
  {
    id: 'rev-1',
    companyName: 'Surf Coffee® Minsk',
    companyLogo: 'SC',
    reviewerName: 'Алина Воронова',
    reviewerRole: 'Управляющая кофейней',
    rating: 5,
    date: '3 июня 2026',
    shiftTitle: 'Бариста утренней смены (8 ч)',
    comment: 'Алексей отлично справился с плотным утренним потоком гостей. Прекрасно варит эспрессо, следит за чистотой станции и кассовой дисциплиной. Будем рады видеть на сменах снова!',
    earned: '95 BYN',
    badgesGiven: ['Пунктуальность', 'Быстрая отдача', 'Вежливость'],
  },
  {
    id: 'rev-2',
    companyName: 'Logistics Pro Minsk',
    companyLogo: 'LP',
    reviewerName: 'Сергей Дорохов',
    reviewerRole: 'Бригадир смены',
    rating: 5,
    date: '28 мая 2026',
    shiftTitle: 'Комплектовщик заказов на складе (6 ч)',
    comment: 'Прибыл без опозданий, внимательно сверил накладные с ТСД-сканером. Собрал 84 заказа без единой ошибки. Надежный исполнитель.',
    earned: '80 BYN',
    badgesGiven: ['Внимание к деталям', 'Высокая скорость'],
  },
  {
    id: 'rev-3',
    companyName: 'Ресторан «Galileo Lounge»',
    companyLogo: 'GL',
    reviewerName: 'Марина Соколова',
    reviewerRole: 'Шеф-бариста',
    rating: 4.9,
    date: '21 мая 2026',
    shiftTitle: 'Помощник бариста / сборщик посуды',
    comment: 'Очень аккуратный молодой человек, опрятный внешний вид, соблюдение саннорм. Гости оставили приятные чаевые.',
    earned: '75 BYN',
    badgesGiven: ['Чистота', 'Санкнижка'],
  },
  {
    id: 'rev-4',
    companyName: 'Green Гипермаркет',
    companyLogo: 'GM',
    reviewerName: 'Виктор Русак',
    reviewerRole: 'Администратор зала',
    rating: 5,
    date: '14 мая 2026',
    shiftTitle: 'Выкладка товара и мерчендайзинг',
    comment: 'Смена прошла на одном дыхании. Все паллеты выставил по планограмме, ценники проверил.',
    earned: '65 BYN',
    badgesGiven: ['Самостоятельность'],
  },
];

interface UserProfileBlockProps {
  currentUser?: UserAccount;
  isStandalone?: boolean;
}

export const UserProfileBlock: React.FC<UserProfileBlockProps> = ({
  currentUser,
  isStandalone = true,
}) => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'history' | 'skills'>('reviews');

  const user = currentUser || {
    id: 'usr-1',
    name: 'Егор Макаров',
    email: 'makarov.work@gmail.com',
    phone: '+375 (29) 682-14-30',
    role: 'user' as const,
    avatar: 'ЕМ',
    rating: 4.98,
    completedShifts: 38,
    punctuality: '100%',
    tgUsername: 'egor_makarov',
    tgConnected: true,
  };

  return (
    <div className={`bg-white rounded-[32px] shadow-[0_20px_60px_rgba(24,29,56,0.08)] border border-slate-200/90 overflow-hidden w-full ${isStandalone ? 'max-w-2xl mx-auto' : ''}`}>
      {/* Clean White Top Header */}
      <div className="bg-white p-6 sm:p-7 border-b border-slate-100 text-[#181D38]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar with Deep Navy styling */}
            <div className="relative">
              <div className="w-18 h-18 rounded-[24px] bg-[#181D38] text-white flex items-center justify-center text-2xl font-black shadow-md">
                {user.avatar}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold" title="Готов к сменам">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[#181D38]">{user.name}</h3>
                <span title="Верифицированный профиль"><CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" /></span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">Минск • Бариста • Склад • Курьер</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  ID: 481920
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  Профиль проверен
                </span>
              </div>
            </div>
          </div>

          {/* Rating Big Badge in Soft Amber */}
          <div className="bg-amber-50/80 border border-amber-200/70 rounded-[22px] p-3.5 sm:text-right shrink-0">
            <div className="flex items-center sm:justify-end gap-1.5">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span className="text-2xl font-black text-amber-950">{user.rating?.toFixed(2) || '4.98'}</span>
            </div>
            <p className="text-[11px] text-amber-800 font-bold mt-0.5">44 отзыва нанимателей</p>
          </div>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-5 bg-slate-50 border-b border-slate-100">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Смен закрыто</span>
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block">{user.completedShifts || 38}</span>
          <span className="text-[10px] text-slate-500">Без нареканий</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Пунктуальность</span>
          </div>
          <span className="text-xl font-black text-emerald-600 mt-1 block">{user.punctuality || '100%'}</span>
          <span className="text-[10px] text-slate-500">0 опозданий</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <span>Заработано</span>
          </div>
          <span className="text-xl font-black text-purple-700 mt-1 block">2 840 Br</span>
          <span className="text-[10px] text-slate-500">В сервисе Halty</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Топ недели</span>
          </div>
          <span className="text-xl font-black text-amber-600 mt-1 block">№ 3</span>
          <span className="text-[10px] text-slate-500">Среди 340 бариста</span>
        </div>
      </div>

      {/* Badges / Achievements Carousel */}
      <div className="p-5 border-b border-slate-100">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Подтвержденные бейджи</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Паспорт проверен</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Санкнижка до 2027</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Супер-пунктуальный</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold shrink-0">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Мастер R-Keeper</span>
          </div>
        </div>
      </div>

      {/* Rating Breakdown & Tabs Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Rating Bars */}
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center shrink-0">
            <span className="text-3xl font-black text-slate-900 block leading-none">4.98</span>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">44 отзыва</span>
          </div>

          <div className="space-y-1 flex-1 max-w-[200px]">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
              <span>5★</span>
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '96%' }} />
              </div>
              <span>96%</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
              <span>4★</span>
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '4%' }} />
              </div>
              <span>4%</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
              <span>3★</span>
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-200 rounded-full" style={{ width: '0%' }} />
              </div>
              <span>0%</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reviews' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Отзывы ({MOCK_USER_REVIEWS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            История смен
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'skills' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Навыки
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-5 space-y-4">
        {activeTab === 'reviews' && (
          <div className="space-y-3.5">
            {MOCK_USER_REVIEWS.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {rev.companyLogo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-black text-slate-900">{rev.companyName}</h5>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                          Работодатель
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{rev.reviewerName} ({rev.reviewerRole}) • {rev.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-amber-800 text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{rev.rating}</span>
                  </div>
                </div>

                <div className="mt-2.5 bg-white/80 p-2.5 rounded-xl border border-slate-200/50 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                  <span>Смена: <strong className="text-slate-900">{rev.shiftTitle}</strong></span>
                  <span className="text-emerald-600 font-bold">Выплата: {rev.earned}</span>
                </div>

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  "{rev.comment}"
                </p>

                {rev.badgesGiven && rev.badgesGiven.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {rev.badgesGiven.map((b, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-medium">
                        👍 {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {[
              { role: 'Бариста утренней смены', place: 'Surf Coffee, пр-т Независимости 37', date: '3 июня 2026', time: '8 часов', pay: '95 BYN', status: 'Выплачено' },
              { role: 'Комплектовщик склада', place: 'Logistics Pro, ул. Громова 30', date: '28 мая 2026', time: '6 часов', pay: '80 BYN', status: 'Выплачено' },
              { role: 'Помощник бармена', place: 'Galileo Lounge, ул. Бобруйская 6', date: '21 мая 2026', time: '5 часов', pay: '75 BYN', status: 'Выплачено' },
              { role: 'Мерчендайзер', place: 'Green ТЦ Dana Mall', date: '14 мая 2026', time: '5 часов', pay: '65 BYN', status: 'Выплачено' },
            ].map((shift, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-900 truncate">{shift.role}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{shift.place}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{shift.date}</span>
                    <span>•</span>
                    <span>{shift.time}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 block">{shift.pay}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {shift.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Профессиональные навыки</h5>
              <div className="flex flex-wrap gap-2">
                {[
                  'Эспрессо & Латте-арт',
                  'Работа с рожковой кофемашиной',
                  'R-Keeper & iiko',
                  'Кассовая дисциплина',
                  'ТСД сканер Zebra',
                  'Комплектация интернет-заказов',
                  'Санитарные нормы СанПин',
                  'Мерчендайзинг',
                ].map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
              <span className="font-black uppercase tracking-wider text-[10px] text-blue-600 block">Верификация профиля</span>
              <p className="leading-relaxed">
                Документы подтверждены Службой безопасности Halty. Профиль имеет приоритет в откликах на смены с повышенной ставкой.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
