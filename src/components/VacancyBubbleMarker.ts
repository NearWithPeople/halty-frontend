import type { Vacancy } from '../types';

export function createVacancyBubbleElement(
  vacancy: Vacancy,
  onClick: (vacancy: Vacancy) => void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vacancy-bubble-container group cursor-pointer select-none';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.transform = 'translate3d(0,0,0)';
  container.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';

  // Hover bounce
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'translate3d(0, -6px, 0) scale(1.08)';
    container.style.zIndex = '50';
  });
  container.addEventListener('mouseleave', () => {
    container.style.transform = 'translate3d(0, 0, 0) scale(1)';
    container.style.zIndex = '10';
  });

  container.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick(vacancy);
  });

  const iconSvg = getIconSvg(vacancy.iconType, vacancy.accentColor);

  // Outer Bubble HTML exactly matching user's screenshot
  container.innerHTML = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <!-- Circular Bubble with thick border and glossy gradient -->
      <div style="
        width: 48px;
        height: 48px;
        border-radius: 9999px;
        background: radial-gradient(circle at 35% 35%, #ffffff 0%, ${vacancy.color} 45%, ${vacancy.color} 100%);
        border: 3.5px solid ${vacancy.accentColor};
        box-shadow: 0 8px 20px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
      ">
        ${iconSvg}
      </div>

      <!-- Drop pointer needle -->
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 7px solid ${vacancy.accentColor};
        margin-top: -1px;
        z-index: 1;
      "></div>

      <!-- Ground anchor point dot -->
      <div style="
        width: 5px;
        height: 5px;
        border-radius: 9999px;
        background-color: ${vacancy.accentColor};
        margin-top: 1px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.6);
      "></div>

      <!-- Title label beneath the bubble matching screenshot -->
      <div style="
        margin-top: 4px;
        color: #ffffff;
        font-weight: 800;
        font-size: 11.5px;
        line-height: 1.15;
        text-align: center;
        max-width: 140px;
        white-space: pre-line;
        text-shadow:
          0 1px 3px #000000,
          0 2px 6px rgba(0, 0, 0, 0.95),
          0 0 8px rgba(0, 0, 0, 0.85);
        letter-spacing: -0.01em;
        pointer-events: none;
      ">
        ${formatLocationTitle(vacancy.locationName)}
      </div>

      <!-- Compact salary badge -->
      <div style="
        margin-top: 2px;
        background-color: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(4px);
        color: #f8fafc;
        font-size: 9.5px;
        font-weight: 700;
        padding: 1.5px 6px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        ${vacancy.salary.split('–')[0].trim()}
      </div>
    </div>
  `;

  return container;
}

function formatLocationTitle(name: string): string {
  // If it contains space, break into two lines like in screenshot
  const parts = name.split(' ');
  if (parts.length >= 2 && parts.length <= 4) {
    const mid = Math.ceil(parts.length / 2);
    return `${parts.slice(0, mid).join(' ')}\n${parts.slice(mid).join(' ')}`;
  }
  return name;
}

function getIconSvg(type: string, color: string): string {
  switch (type) {
    case 'tree':
      // Tree icon from the user screenshot
      return `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}">
          <path d="M12 2C9.24 2 7 4.24 7 7c0 .58.1 1.14.28 1.66A4.996 4.996 0 0 0 5 13c0 2.45 1.76 4.49 4.09 4.91V20c0 .55.45 1 1 1h3.82c.55 0 1-.45 1-1v-2.09C17.24 17.49 19 15.45 19 13c0-1.89-1.05-3.53-2.6-4.38.38-.5.6-1.12.6-1.78 0-2.69-2.19-4.84-4.88-4.84h-.12Z"/>
        </svg>
      `;
    case 'coffee':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
          <line x1="6" y1="2" x2="6" y2="4"/>
          <line x1="10" y1="2" x2="10" y2="4"/>
          <line x1="14" y1="2" x2="14" y2="4"/>
        </svg>
      `;
    case 'shopping':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      `;
    case 'delivery':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      `;
    case 'laptop':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="12" x="3" y="4" rx="2"/>
          <line x1="2" y1="20" x2="22" y2="20"/>
        </svg>
      `;
    case 'wrench':
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      `;
    default:
      return `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;
  }
}
