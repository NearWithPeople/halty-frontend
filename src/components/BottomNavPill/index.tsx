import './styles.css';
import { MapPin, Briefcase, ClipboardList, MessageSquare } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'map', label: 'Карта', icon: MapPin },
  { id: 'jobs', label: 'Вакансии', icon: Briefcase },
  { id: 'applications', label: 'Отклики', icon: ClipboardList },
  { id: 'chats', label: 'Чат', icon: MessageSquare },
];

interface BottomNavPillProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  applicationsBadge?: number;
  chatsBadge?: number;
  isStatic?: boolean;
}

export const BottomNavPill: React.FC<BottomNavPillProps> = ({
  activeTab = 'map',
  onTabChange,
  applicationsBadge,
  chatsBadge,
  isStatic = false,
}) => (
  <nav
    aria-label="Навигация"
    className={
      isStatic
        ? 'relative z-10 pointer-events-auto select-none inline-block'
        : 'fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none'
    }
  >
    <div className="flex items-center gap-2 sm:gap-4 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-[0_16px_45px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.35)] rounded-full">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const badgeCount =
          item.id === 'applications'
            ? applicationsBadge
            : item.id === 'chats'
            ? chatsBadge
            : undefined;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange?.(item.id)}
            className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isActive ? 'text-slate-950 dark:text-white font-extrabold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {/* Icon Bubble with Badge */}
            <div className="relative">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#181D38] text-white shadow-md'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>

              {/* Red Badge */}
              {typeof badgeCount === 'number' && badgeCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[15px] h-3.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center bg-red-500 text-white leading-none shadow-2xs">
                  {badgeCount}
                </span>
              )}
            </div>

            {/* Label from Screenshot 1 */}
            <span className="text-[10px] tracking-tight mt-0.5 leading-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);
