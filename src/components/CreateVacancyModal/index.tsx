import './styles.css';
import '../PanelScroll/styles.css';
import React, { useState, useEffect } from 'react';
import {
  X, Plus, MapPin, Sparkles, Crosshair, Check
} from 'lucide-react';
import type { VacancyCategory, Coordinates } from '../../types';

export interface PickedLocationInfo {
  coords: Coordinates;
  name: string;
  address?: string;
}

interface CreateVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateVacancy: (data: {
    title: string;
    company: string;
    salary: string;
    category: VacancyCategory;
    categoryLabel: string;
    coordinates: Coordinates;
    locationName: string;
    address?: string;
    description: string;
    requirements: string[];
    schedule: string;
    payoutType: string;
    attachmentType?: 'building' | 'ground_zone';
  }) => void;
  currentMapCenter?: Coordinates;
  pickedLocation?: PickedLocationInfo | null;
  onStartPickOnMap?: () => void;
  isStatic?: boolean;
}

const MINSK_PRESET_LOCATIONS: { name: string; coords: Coordinates; address: string }[] = [
  { name: 'ТЦ "Galleria Minsk"', coords: { lng: 27.5502, lat: 53.9084 }, address: 'пр-т Победителей, 9' },
  { name: 'ТЦ "Dana Mall"', coords: { lng: 27.6521, lat: 53.9332 }, address: 'ул. Петра Мстиславца, 11' },
  { name: 'Минский Ж/Д Вокзал', coords: { lng: 27.5505, lat: 53.8906 }, address: 'пл. Привокзальная, 3' },
  { name: 'Центральный Парк Горького', coords: { lng: 27.5721, lat: 53.9031 }, address: 'ул. Первомайская, 2' },
  { name: 'Площадь Победы', coords: { lng: 27.5752, lat: 53.9085 }, address: 'пл. Победы, 1' },
  { name: 'Парк Челюскинцев', coords: { lng: 27.6186, lat: 53.9234 }, address: 'пр-т Независимости, 84' },
];

const CATEGORIES: { id: VacancyCategory; label: string }[] = [
  { id: 'horeca', label: 'Рестораны и кофе' },
  { id: 'retail', label: 'Ритейл и продажи' },
  { id: 'delivery', label: 'Доставка и курьеры' },
  { id: 'parks_green', label: 'Парки и зоны отдыха' },
  { id: 'service', label: 'Сервис и клининг' },
  { id: 'it_creative', label: 'Креатив и IT' },
];

/**
 * System-level heuristic to automatically determine attachment type:
 * If an address or building is specified -> 'building'
 * If open park, green area, square, or raw outdoor point -> 'ground_zone'
 */
export function determineAttachmentType(address?: string, placeName?: string): 'building' | 'ground_zone' {
  const combined = `${address || ''} ${placeName || ''}`.toLowerCase();
  if (
    combined.includes('парк') ||
    combined.includes('сквер') ||
    combined.includes('пляж') ||
    combined.includes('остров') ||
    combined.includes('роща') ||
    combined.includes('зона отдыха') ||
    combined.includes('лес')
  ) {
    return 'ground_zone';
  }
  if (
    /\d+/.test(combined) ||
    combined.includes('ул.') ||
    combined.includes('пр-т') ||
    combined.includes('переул') ||
    combined.includes('шоссе') ||
    combined.includes('тц') ||
    combined.includes('трц') ||
    combined.includes('вокзал') ||
    combined.includes('корпус') ||
    combined.includes('дом')
  ) {
    return 'building';
  }
  return 'ground_zone';
}

export const CreateVacancyModal: React.FC<CreateVacancyModalProps> = ({
  isOpen,
  onClose,
  onCreateVacancy,
  pickedLocation,
  onStartPickOnMap,
  isStatic = false,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [salary, setSalary] = useState('85 – 130 BYN / смена');
  const [category, setCategory] = useState<VacancyCategory>('horeca');
  const [schedule, setSchedule] = useState('С 09:00 до 18:00 (гибкий)');
  const [payoutType, setPayoutType] = useState('Ежедневно');
  const [description, setDescription] = useState('');
  const [requirementsRaw, setRequirementsRaw] = useState('Опрятный вид, пунктуальность, вежливость');

  // Location state (can be set by preset, manual typing, or picking on map)
  const [locationName, setLocationName] = useState(MINSK_PRESET_LOCATIONS[0].name);
  const [locationAddress, setLocationAddress] = useState(MINSK_PRESET_LOCATIONS[0].address);
  const [locationCoords, setLocationCoords] = useState<Coordinates>(MINSK_PRESET_LOCATIONS[0].coords);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number | null>(0);

  // Sync when a point is chosen on map
  useEffect(() => {
    if (pickedLocation) {
      setLocationName(pickedLocation.name);
      setLocationAddress(pickedLocation.address || '');
      setLocationCoords(pickedLocation.coords);
      setSelectedPresetIdx(null);
    }
  }, [pickedLocation]);

  if (!isOpen) return null;

  const handleSelectPreset = (idx: number) => {
    const loc = MINSK_PRESET_LOCATIONS[idx];
    setSelectedPresetIdx(idx);
    setLocationName(loc.name);
    setLocationAddress(loc.address);
    setLocationCoords(loc.coords);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return;

    const catObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const requirements = requirementsRaw
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    // Automatic attachment type calculation under the hood
    const attachmentType = determineAttachmentType(locationAddress, locationName);

    onCreateVacancy({
      title: title.trim(),
      company: company.trim(),
      salary: salary.trim(),
      category,
      categoryLabel: catObj.label,
      coordinates: locationCoords,
      locationName: locationName.trim(),
      address: locationAddress.trim(),
      description:
        description.trim() ||
        `Срочная подработка от работодателя "${company.trim()}". Требуется сотрудник на смену с оплатой ${salary}. Приглашаем ответственных кандидатов.`,
      requirements: requirements.length > 0 ? requirements : ['Паспорт / ВНЖ', 'Опрятность', 'Пунктуальность'],
      schedule: schedule.trim(),
      payoutType: payoutType.trim(),
      attachmentType,
    });

    onClose();
  };

  const cardContent = (
    <div className={`bg-white rounded-[32px] overflow-hidden flex flex-col border border-slate-200 ${isStatic ? 'w-full max-w-[500px] shadow-xl relative max-h-[780px]' : 'w-full max-w-[500px] max-h-[90vh] shadow-2xl'}`}>
      {/* Header */}
      <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Создать вакансию</h2>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
              Режим: АДМИН (Работодатель)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto panel-scroll p-5 space-y-4 text-xs">
          {/* Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Название должности</label>
              <input
                type="text"
                required
                placeholder="напр. Бариста, Комплектовщик"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Компания / Заведение</label>
              <input
                type="text"
                required
                placeholder="напр. CoffeeHub Minsk"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-bold"
              />
            </div>
          </div>

          {/* Salary & Payout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Оплата (ставка)</label>
              <input
                type="text"
                required
                placeholder="90 – 140 BYN / смена"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Выплата</label>
              <select
                value={payoutType}
                onChange={(e) => setPayoutType(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-bold cursor-pointer"
              >
                <option value="Ежедневно">Ежедневно (в конце смены)</option>
                <option value="Еженедельно">Еженедельно</option>
                <option value="2 раза в месяц">2 раза в месяц</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Категория смены</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`py-2.5 px-3 rounded-full text-[11px] font-black text-center transition-all cursor-pointer truncate ${
                    category === c.id
                      ? 'bg-[#181D38] text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location Picker Section */}
          <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                <span>Локация проведения смены</span>
              </label>
              {onStartPickOnMap && (
                <button
                  type="button"
                  onClick={onStartPickOnMap}
                  className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Указать на карте</span>
                </button>
              )}
            </div>

            {/* Selected Location Card */}
            <div className="p-3 rounded-xl bg-white border border-purple-200/80 shadow-2xs space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Название места / Заведение:</span>
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    setSelectedPresetIdx(null);
                  }}
                  placeholder="напр. ТРЦ Galleria Minsk или Кофейня"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Точный адрес (если есть):</span>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => {
                    setLocationAddress(e.target.value);
                    setSelectedPresetIdx(null);
                  }}
                  placeholder="напр. пр-т Победителей, 9"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Координаты:</span>
                <span className="font-mono text-slate-600">
                  {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] text-slate-500 font-bold block mb-1">
                Или выберите популярное место:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MINSK_PRESET_LOCATIONS.map((loc, idx) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      selectedPresetIdx === idx
                        ? 'bg-purple-600 text-white font-bold shadow-2xs'
                        : 'bg-white border border-purple-200/60 text-slate-700 hover:bg-purple-100/50'
                    }`}
                  >
                    {selectedPresetIdx === idx && <Check className="w-3 h-3" />}
                    <span>{loc.name.replace('ТЦ "', '').replace('"', '')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule & Requirements */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">График работы</label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="напр. 2/2 или с 10:00 до 19:00"
              className="w-full px-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Требования к кандидату</label>
            <textarea
              rows={2}
              value={requirementsRaw}
              onChange={(e) => setRequirementsRaw(e.target.value)}
              placeholder="Каждое требование с новой строки"
              className="w-full p-3.5 rounded-[22px] bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Описание обязанностей</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко опишите задачи на смене…"
              className="w-full p-3.5 rounded-[22px] bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#181D38] font-medium"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#181D38] hover:bg-[#252C54] text-white font-black text-xs transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Опубликовать вакансию на карте</span>
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </form>
      </div>
  );

  if (isStatic) {
    return cardContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      {cardContent}
    </div>
  );
};
