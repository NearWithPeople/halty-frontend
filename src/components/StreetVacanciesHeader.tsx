import React from 'react';
import { ChevronRight } from 'lucide-react';

interface StreetVacanciesHeaderProps {
  streetName?: string;
  vacanciesCount?: number | string;
  onOpenList?: () => void;
}

export const StreetVacanciesHeader: React.FC<StreetVacanciesHeaderProps> = ({
  streetName = 'пр. Независимости',
  vacanciesCount = 4,
  onOpenList,
}) => {
  return (
    <div className="flex flex-col select-none pointer-events-auto">
      {/* Main Street Title */}
      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
        {streetName}
      </h1>

      {/* Vacancies count with underline link and chevron arrow */}
      <button
        onClick={onOpenList}
        className="flex items-center gap-1 mt-1 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-colors group cursor-pointer text-left w-fit drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
      >
        <span className="underline underline-offset-4 decoration-white/40 group-hover:decoration-white">
          {vacanciesCount} {typeof vacanciesCount === 'number' ? getVacanciesWord(vacanciesCount) : ''} поблизости
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

function getVacanciesWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) return 'вакансий';
  if (mod10 === 1) return 'вакансия';
  if (mod10 >= 2 && mod10 <= 4) return 'вакансии';
  return 'вакансий';
}
