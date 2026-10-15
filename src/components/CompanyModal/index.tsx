import './styles.css';
import React, { useState } from 'react';
import {
  X, Star, MapPin,
  Phone, ShieldCheck, Heart
} from 'lucide-react';
import type { Vacancy } from '../../types';

export interface CompanyData {
  name: string;
  legalName: string;
  category: string;
  rating: number;
  reviewsCount: number;
  completedShiftsCount: number;
  onTimePayoutRate: string;
  averageResponseMinutes: number;
  verified: boolean;
  avatarBg: string;
  avatarText: string;
  coverImage?: string;
  description: string;
  establishedYear: number;
  address: string;
  phone: string;
  telegram: string;
  website: string;
  hrName: string;
  perks: { icon: string; title: string; desc: string }[];
  gallery: string[];
  reviews: {
    id: string;
    author: string;
    role: string;
    avatar: string;
    rating: number;
    date: string;
    text: string;
    shiftEarned?: string;
  }[];
}

export const MOCK_COMPANY_DETAILS: Record<string, CompanyData> = {
  default: {
    name: 'Surf Coffee® Minsk',
    legalName: 'ООО «Серф Кофе БЕЛ»',
    category: 'Сеть specialty-кофеен и пекарен',
    rating: 4.9,
    reviewsCount: 48,
    completedShiftsCount: 142,
    onTimePayoutRate: '99.4%',
    averageResponseMinutes: 12,
    verified: true,
    avatarBg: 'from-amber-600 to-orange-500',
    avatarText: 'SC',
    description:
      'Surf Coffee® — сеть аутентичных кофеен третьей волны. Мы создаем теплую атмосферу для гостей и комфортные, честные условия для наших бариста и стажеров. Поддерживаем экологические инициативы, готовим кофе спешелти-грейда и свежую выпечку.',
    establishedYear: 2018,
    address: 'г. Минск, пр-т Независимости, 37А / ул. Кирова, 19',
    phone: '+375 (29) 345-67-89',
    telegram: '@surfcoffee_minsk_hr',
    website: 'surfcoffee.by',
    hrName: 'Представитель работодателя',
    perks: [
      { icon: '💳', title: 'Выплаты в день смены', desc: 'Перевод на карту сразу после подтверждения часов' },
      { icon: '☕', title: 'Бесплатный кофе и ланч', desc: 'Любые напитки из меню и выпечка на смене' },
      { icon: '⏱️', title: 'Гибкие смены от 4 часов', desc: 'Утренние, дневные или вечерние слоты на выбор' },
      { icon: '🎓', title: 'Обучение за 15 минут', desc: 'Бригадир поможет освоить кофемашину и кассу' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=80',
    ],
    reviews: [
      {
        id: 'cr-1',
        author: 'Максим Л.',
        role: 'Бариста выходного дня',
        avatar: 'МЛ',
        rating: 5,
        date: '3 дня назад',
        text: 'Работал на точке в центре. Коллектив дружелюбный, сразу выдали фартук, объяснили работу с R-Keeper. Деньги 85 Br упали на карту через 10 минут после закрытия смены!',
        shiftEarned: '85 BYN / смена',
      },
      {
        id: 'cr-2',
        author: 'Екатерина Н.',
        role: 'Помощник бариста',
        avatar: 'ЕН',
        rating: 5,
        date: '1 неделя назад',
        text: 'Супер локация, современное зерно и классные гости. Очень комфортный управляющий, без лишнего давления.',
        shiftEarned: '70 BYN / смена',
      },
      {
        id: 'cr-3',
        author: 'Денис К.',
        role: 'Сотрудник зоны заказов',
        avatar: 'ДК',
        rating: 4.8,
        date: '2 недели назад',
        text: 'Все четко по договоренности. Оплата стабильная. Единственное — высокий темп в обеденное время, но с перерывами.',
        shiftEarned: '90 BYN / смена',
      },
    ],
  },
};

export interface CompanyModalProps {
  companyName?: string;
  companyData?: CompanyData;
  vacancies?: Vacancy[];
  isOpen?: boolean;
  isStandalone?: boolean;
  onClose?: () => void;
  onApplyVacancy?: (vacancy: Vacancy) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  companyName = 'Surf Coffee® Minsk (ООО «Кофе Хаб»)',
  companyData,
  vacancies = [],
  isOpen = true,
  isStandalone = false,
  onClose,
  onApplyVacancy,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'vacancies' | 'reviews'>('about');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likedReviews, setLikedReviews] = useState<Record<string, number>>({ 'cr-1': 14, 'cr-2': 9, 'cr-3': 5 });
  const [userLiked, setUserLiked] = useState<Record<string, boolean>>({});

  if (!isOpen && !isStandalone) return null;

  const data: CompanyData = companyData || {
    ...MOCK_COMPANY_DETAILS.default,
    name: companyName.includes('(') ? companyName : `${companyName} (ООО «Кофе Хаб»)`,
    legalName: 'ООО «Кофе Хаб»',
  };

  const companyVacancies = vacancies.filter(
    (v) => v.company.toLowerCase() === companyName.toLowerCase() || v.company.includes(companyName)
  );

  const toggleLike = (id: string) => {
    setUserLiked(prev => {
      const isL = !!prev[id];
      setLikedReviews(l => ({ ...l, [id]: (l[id] || 0) + (isL ? -1 : 1) }));
      return { ...prev, [id]: !isL };
    });
  };

  const content = (
    <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(24,29,56,0.12)] border border-slate-200/90 overflow-hidden w-full max-w-xl text-[#181D38]">
      {/* Clean White Top Header with badges and close/favorite */}
      <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-[#181D38] tracking-tight">{data.name}</h2>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Проверенная организация</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-bold">{data.category} • Минск</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isBookmarked ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Сохранить компанию"
          >
            <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>
          {!isStandalone && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar & Tabs */}
      <div className="px-6 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-sm font-black text-amber-900">{data.rating.toFixed(1)}</span>
            <span className="text-xs text-amber-700 font-bold">({data.reviewsCount} отзывов)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <span>Закрыто: <strong className="text-[#181D38]">{data.completedShiftsCount}+ смен</strong></span>
            <span>Выплаты: <strong className="text-emerald-600">{data.onTimePayoutRate}</strong></span>
          </div>
        </div>

        {/* Quick Highlights Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100/80">
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Закрыто смен</span>
            <span className="text-base font-black text-slate-800 mt-0.5 block">{data.completedShiftsCount}+</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Выплаты вовремя</span>
            <span className="text-base font-black text-emerald-600 mt-0.5 block">{data.onTimePayoutRate}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ответ на заявку</span>
            <span className="text-base font-black text-blue-600 mt-0.5 block">~{data.averageResponseMinutes} мин</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'about'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            О компании
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vacancies')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vacancies'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>Вакансии</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'vacancies' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {companyVacancies.length || 3}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>Отзывы</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {data.reviews.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-6 max-h-[52vh] overflow-y-auto space-y-6">
        {activeTab === 'about' && (
          <>
            {/* Description */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Описание</h3>
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{data.description}</p>
            </div>

            {/* Perks & Benefits */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Преимущества для исполнителей</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.perks.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xl shrink-0 mt-0.5">{p.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workplaces Photo Gallery */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Локации и атмосфера</h3>
              <div className="grid grid-cols-4 gap-2">
                {data.gallery.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 group">
                    <img
                      src={img}
                      alt={`Office ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Contacts & Addresses */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-800 font-medium">{data.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a href={`tel:${data.phone}`} className="text-[#181D38] font-bold hover:underline">{data.phone}</a>
                <span className="text-slate-400 text-[11px]">(Представитель организации)</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'vacancies' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Открытые смены в Минске</span>
              <span className="text-[11px] text-slate-400">Быстрый отклик без резюме</span>
            </div>

            {/* List of vacancies */}
            {(companyVacancies.length > 0
              ? companyVacancies
              : [
                  {
                    id: 'cv-1',
                    title: 'Бариста утренней смены',
                    salary: '~85 BYN / смена',
                    locationName: 'пр-т Независимости, 37А',
                    schedule: 'с 08:00 до 16:00',
                    color: '#f97316',
                    payoutType: 'В день смены',
                  },
                  {
                    id: 'cv-2',
                    title: 'Помощник бариста / сборщик заказов',
                    salary: '~70 BYN / смена',
                    locationName: 'ул. Кирова, 19',
                    schedule: 'с 14:00 до 20:00',
                    color: '#6366f1',
                    payoutType: 'В день смены',
                  },
                  {
                    id: 'cv-3',
                    title: 'Сотрудник вечерней уборки и переучета',
                    salary: '~50 BYN / смена',
                    locationName: 'пр-т Независимости, 37А',
                    schedule: 'с 21:00 до 23:30',
                    color: '#10b981',
                    payoutType: 'Сразу после закрытия',
                  },
                ]
            ).map((vac: any) => (
              <div
                key={vac.id}
                className="p-4 rounded-[24px] bg-white border border-slate-200/90 shadow-2xs hover:border-[#181D38] transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: vac.color || '#3b82f6' }} />
                    <h4 className="text-xs font-bold text-[#181D38] truncate">{vac.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-extrabold text-[#181D38]">{vac.salary}</span>
                    <span>•</span>
                    <span className="truncate">{vac.locationName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyVacancy && onApplyVacancy(vac)}
                  className="px-4 py-2 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white text-xs font-black shrink-0 transition-transform active:scale-95 cursor-pointer"
                >
                  Откликнуться
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {data.reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-[26px] bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#181D38] text-white font-bold text-xs flex items-center justify-center">
                      {rev.avatar}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#181D38]">{rev.author}</h4>
                      <p className="text-[10px] text-slate-500">{rev.role} • {rev.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-amber-800 text-[11px] font-bold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>{rev.rating}</span>
                  </div>
                </div>

                {/* Pros & Cons Section */}
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                    <strong className="text-emerald-700 block text-[10px] uppercase font-black">Что понравилось:</strong>
                    <span className="mt-0.5 block leading-relaxed">{rev.text}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-700">
                    <strong className="text-slate-500 block text-[10px] uppercase font-black">Что можно улучшить:</strong>
                    <span className="mt-0.5 block leading-relaxed text-[11px]">Интенсивный поток гостей в пиковые часы, требуется собранность.</span>
                  </div>
                </div>

                {/* Review Footer: Shift Earned + Likes + Report Button */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Выплата:</span>
                    <span className="font-extrabold text-emerald-600 text-[11px]">{rev.shiftEarned || '85 BYN'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLike(rev.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                        userLiked[rev.id] ? 'bg-[#181D38] text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>👍</span>
                      <span>{likedReviews[rev.id] || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => alert('Жалоба отправлена модераторам Halty.')}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Пожаловаться
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          <span>Служба заботы платформы: </span>
          <strong className="text-[#181D38]">Служба поддержки</strong>
        </div>

        <button
          type="button"
          onClick={() => alert('Служба поддержки Halty подключена к диалогу')}
          className="px-5 py-2.5 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white text-xs font-black transition-transform active:scale-95 cursor-pointer shadow-md"
        >
          Служба поддержки
        </button>
      </div>
    </div>
  );

  if (isStandalone) {
    return content;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()}>{content}</div>
    </div>
  );
};
