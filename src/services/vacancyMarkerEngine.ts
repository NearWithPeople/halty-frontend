import mapboxgl from 'mapbox-gl';
import type { Vacancy } from '../types';

export interface OffscreenDot {
  vacancy: Vacancy;
  edgeX: number;
  edgeY: number;
}

export interface MarkerItem {
  id: string;
  marker: mapboxgl.Marker;
  rootEl: HTMLElement;
  innerEl: HTMLElement;
  anchorDotEl: HTMLElement;
  bubbleStemEl: HTMLElement;
  bubbleHeadEl: HTMLElement;
  needleEl: HTMLElement;
  iconWrapEl: HTMLElement;
  clusterWrapEl: HTMLElement;
  clusterCountEl: HTMLElement;
  dockDotEl: HTMLElement;
  bubbleLabelEl: HTMLElement;
  vacancy: Vacancy;
  isSelected: boolean;
  defaultBackground: string;
  defaultBorder: string;
  defaultNeedleBorder: string;
  state: 'single' | 'medium' | 'cluster' | 'docked' | 'dot' | 'selected' | 'hidden';
  activeCluster: ClusterGroup | null;
  orderKey: number;
  isAttached: boolean;
  clusterCount: number;
}

interface ClusterGroup {
  primary: MarkerItem;
  members: MarkerItem[];
  count: number;
  centerLng: number;
  centerLat: number;
  centerPt: { x: number; y: number };
}

export class VacancyMarkerEngine {
  private map: mapboxgl.Map;
  private markers: Map<string, MarkerItem> = new Map();
  private hasSynced = false;
  private onSelectVacancy: (vac: Vacancy) => void;
  private selectedVacancyId: string | null = null;
  private isDestroyed = false;
  private rafId: number | null = null;
  private moveEndHandler: (() => void) | null = null;

  constructor(
    map: mapboxgl.Map,
    onSelectVacancy: (vac: Vacancy) => void
  ) {
    this.map = map;
    this.onSelectVacancy = onSelectVacancy;
    this.bindEvents();
  }

  private bindEvents() {
    const handleMove = () => {
      if (this.isDestroyed) return;
      this.requestTick();
    };

    this.moveEndHandler = () => {
      if (this.isDestroyed) return;
      this.requestTick();
    };

    this.map.on('move', handleMove);
    this.map.on('zoom', handleMove);
    this.map.on('moveend', this.moveEndHandler);
    this.map.on('resize', this.moveEndHandler);
  }

  public requestTick() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.isDestroyed) return;
      this.tick();
    });
  }

  public setVacancies(vacancies: Vacancy[], selectedVacancyId: string | null) {
    this.selectedVacancyId = selectedVacancyId;

    const newIds = new Set(vacancies.map((v) => v.id));

    // Remove deleted markers
    this.markers.forEach((item, id) => {
      if (!newIds.has(id)) {
        item.marker.remove();
        this.markers.delete(id);
      }
    });

    // Add new markers. Markers after the first sync pop in, so a live vacancy is visible.
    vacancies.forEach((vac) => {
      if (!this.markers.has(vac.id)) {
        const markerItem = this.createMarkerItem(vac, this.hasSynced);
        this.markers.set(vac.id, markerItem);
      }
    });

    this.hasSynced = true;
    this.requestTick();
  }

  public setSelectedVacancy(id: string | null) {
    this.selectedVacancyId = id;
    if (!id) {
      this.resetMarkerPositions();
    }
    this.requestTick();
  }

  public alignSelectedMarker(lngLat: [number, number]) {
    if (!this.selectedVacancyId) return;
    const item = this.markers.get(this.selectedVacancyId);
    if (item) {
      item.marker.setLngLat(lngLat);
      this.requestTick();
    }
  }

  public resetMarkerPositions() {
    this.markers.forEach((item) => {
      item.marker.setLngLat([item.vacancy.coordinates.lng, item.vacancy.coordinates.lat]);
    });
    this.requestTick();
  }

  private handleMarkerClick(item: MarkerItem) {
    let vacancy = item.vacancy;

    if (item.state === 'cluster' && item.activeCluster && item.activeCluster.count > 1) {
      vacancy = item.activeCluster.primary.vacancy;
      if (this.map.getZoom() < 15) {
        const { centerLng, centerLat, count } = item.activeCluster;
        this.map.flyTo({
          center: [centerLng, centerLat],
          zoom: Math.min(this.map.getMaxZoom(), this.map.getZoom() + (count > 8 ? 2.2 : 1.4)),
          duration: 650,
        });
      }
    }

    this.onSelectVacancy(vacancy);
  }

  private setMarkerAttached(item: MarkerItem, attached: boolean) {
    if (attached && !item.isAttached) {
      item.marker.addTo(this.map);
      item.isAttached = true;
    } else if (!attached && item.isAttached) {
      item.marker.remove();
      item.isAttached = false;
    }
  }

  private hideMarker(item: MarkerItem) {
    this.setMarkerAttached(item, false);
    if (item.state !== 'hidden') {
      item.rootEl.style.display = 'none';
      item.state = 'hidden';
      item.activeCluster = null;
    }
  }

  private showClusterMarker(item: MarkerItem, group: ClusterGroup) {
    this.setMarkerAttached(item, true);
    item.marker.setLngLat([group.centerLng, group.centerLat]);
    item.activeCluster = group;
    item.clusterCount = group.count;

    const color = clusterDensityColor(group.count);
    const size = Math.min(52, 30 + Math.min(group.count, 18) * 1.4);

    item.rootEl.style.display = 'block';
    item.clusterWrapEl.style.display = 'flex';
    item.clusterWrapEl.style.background = color;
    item.clusterWrapEl.style.width = `${size}px`;
    item.clusterWrapEl.style.height = `${size}px`;
    item.clusterCountEl.textContent = String(group.count);

    if (item.state !== 'cluster' || item.rootEl.dataset.count !== String(group.count)) {
      item.rootEl.className = 'vac-marker-root vac-mode-cluster';
      item.rootEl.dataset.count = String(group.count);
      item.anchorDotEl.style.opacity = '0';
      item.bubbleLabelEl.style.display = 'none';
      item.state = 'cluster';
    }

    item.innerEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
  }

  private showPinMarker(
    item: MarkerItem,
    mode: 'single' | 'medium' | 'dot',
    wasHidden: boolean
  ) {
    this.setMarkerAttached(item, true);
    item.marker.setLngLat([item.vacancy.coordinates.lng, item.vacancy.coordinates.lat]);
    item.activeCluster = null;
    item.rootEl.style.display = 'block';
    item.clusterWrapEl.style.display = 'none';

    const classMap = {
      single: 'vac-marker-root vac-mode-circle',
      medium: 'vac-marker-root vac-mode-medium-pin',
      dot: 'vac-marker-root vac-mode-dot',
    };

    if (item.state !== mode) {
      item.rootEl.className = wasHidden
        ? `${classMap[mode]} vac-morph-in`
        : classMap[mode];
      item.anchorDotEl.style.opacity = mode === 'dot' ? '0' : '1';
      item.bubbleLabelEl.style.display = 'none';
      item.state = mode;
    }

    if (mode === 'single') {
      item.iconWrapEl.style.transform = '';
    }

    item.innerEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
  }

  private tick() {
    if (this.isDestroyed) return;

    const canvas = this.map.getCanvas();
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const zoom = this.map.getZoom();

    // 1. IF A VACANCY IS SELECTED: Show only the selected marker on the map, hide all others
    if (this.selectedVacancyId !== null) {
      this.markers.forEach((item) => {
        const isSelected = item.id === this.selectedVacancyId;
        if (!isSelected) {
          this.hideMarker(item);
          return;
        }

        this.setMarkerAttached(item, true);
        item.marker.setLngLat([item.vacancy.coordinates.lng, item.vacancy.coordinates.lat]);
        item.rootEl.style.display = 'block';
        item.clusterWrapEl.style.display = 'none';

        if (item.state !== 'selected') {
          item.rootEl.className = 'vac-marker-root vac-mode-selected';
          item.anchorDotEl.style.opacity = '1';
          item.bubbleLabelEl.style.display = 'flex';
          item.bubbleLabelEl.style.opacity = '1';
          item.bubbleLabelEl.style.visibility = 'visible';
          item.state = 'selected';
        }

        item.innerEl.style.transform = 'translate3d(0, 0, 0) scale(1.6)';
      });
      return;
    }

    // Reset geo positions before re-clustering
    this.markers.forEach((item) => {
      item.marker.setLngLat([item.vacancy.coordinates.lng, item.vacancy.coordinates.lat]);
      item.activeCluster = null;
    });

    const margin = 8;
    const onScreenItems: { item: MarkerItem; pt: mapboxgl.Point; orderKey: number }[] = [];

    this.markers.forEach((item) => {
      const vac = item.vacancy;
      const pt = this.map.project([vac.coordinates.lng, vac.coordinates.lat]);

      const isValidProjection =
        Number.isFinite(pt.x) &&
        Number.isFinite(pt.y) &&
        Math.abs(pt.x) < 40000 &&
        Math.abs(pt.y) < 40000;

      const isOnScreen =
        isValidProjection &&
        pt.x >= margin &&
        pt.x <= width - margin &&
        pt.y >= margin &&
        pt.y <= height - margin;

      if (isOnScreen) {
        onScreenItems.push({ item, pt, orderKey: item.orderKey });
      } else {
        this.hideMarker(item);
      }
    });

    if (onScreenItems.length === 0) return;

    onScreenItems.sort((a, b) => a.orderKey - b.orderKey);

    const density = onScreenItems.length / Math.max(1, (width * height) / (90 * 90));
    const clusterRadius =
      zoom < 13 ? 68 : zoom < 14.5 ? 56 : density > 1.2 ? 62 : density > 0.6 ? 50 : 42;

    const clusters = buildScreenClusters(onScreenItems, clusterRadius);

    interface PlacedBox {
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }

    const placedBoxes: PlacedBox[] = [];
    const collidesWithPlaced = (box: PlacedBox, gap = 4): boolean => {
      for (const p of placedBoxes) {
        if (
          box.x1 < p.x2 + gap &&
          box.x2 + gap > p.x1 &&
          box.y1 < p.y2 + gap &&
          box.y2 + gap > p.y1
        ) {
          return true;
        }
      }
      return false;
    };

    const hiddenItems = new Set<MarkerItem>();

    // 2. Render multi-pin clusters as a single density-colored circle
    for (const group of clusters) {
      if (group.count < 2) continue;

      const centerPt = this.map.project([group.centerLng, group.centerLat]);
      const size = Math.min(52, 30 + Math.min(group.count, 18) * 1.4);
      const half = size / 2 + 4;

      placedBoxes.push({
        x1: centerPt.x - half,
        x2: centerPt.x + half,
        y1: centerPt.y - half,
        y2: centerPt.y + half,
      });

      this.showClusterMarker(group.primary, group);

      for (const member of group.members) {
        if (member !== group.primary) {
          hiddenItems.add(member);
          this.hideMarker(member);
        }
      }
    }

    // 3. Render singletons with collision-aware pin shrinking
    for (const group of clusters) {
      if (group.count !== 1) continue;

      const item = group.primary;
      if (hiddenItems.has(item)) continue;

      const pt = this.map.project([item.vacancy.coordinates.lng, item.vacancy.coordinates.lat]);

      const fullBox: PlacedBox = {
        x1: pt.x - 26,
        x2: pt.x + 26,
        y1: pt.y - 77,
        y2: pt.y + 3,
      };

      if (!collidesWithPlaced(fullBox, 4)) {
        placedBoxes.push(fullBox);
        this.showPinMarker(item, 'single', item.state === 'hidden');
        continue;
      }

      const mediumBox: PlacedBox = {
        x1: pt.x - 11,
        x2: pt.x + 11,
        y1: pt.y - 28,
        y2: pt.y + 2,
      };

      if (!collidesWithPlaced(mediumBox, 3)) {
        placedBoxes.push(mediumBox);
        this.showPinMarker(item, 'medium', item.state === 'hidden');
        continue;
      }

      const dotBox: PlacedBox = {
        x1: pt.x - 9,
        x2: pt.x + 9,
        y1: pt.y - 9,
        y2: pt.y + 9,
      };

      if (!collidesWithPlaced(dotBox, 2)) {
        placedBoxes.push(dotBox);
        this.showPinMarker(item, 'dot', item.state === 'hidden');
        continue;
      }

      // Too crowded — merge into nearest visible cluster
      const nearest = findNearestCluster(pt, clusters);
      if (nearest && nearest.count >= 2) {
        nearest.count += 1;
        nearest.members.push(item);
        const color = clusterDensityColor(nearest.count);
        const size = Math.min(52, 30 + Math.min(nearest.count, 18) * 1.4);
        nearest.primary.clusterWrapEl.style.background = color;
        nearest.primary.clusterWrapEl.style.width = `${size}px`;
        nearest.primary.clusterWrapEl.style.height = `${size}px`;
        nearest.primary.clusterCountEl.textContent = String(nearest.count);
        nearest.primary.rootEl.dataset.count = String(nearest.count);
        this.hideMarker(item);
      } else {
        this.showPinMarker(item, 'dot', item.state === 'hidden');
      }
    }
  }

  private createMarkerItem(vac: Vacancy, popIn: boolean): MarkerItem {
    // 0x0 root element: Mapbox translates (0,0) exactly to geo coordinates
    const rootEl = document.createElement('div');
    rootEl.className = popIn ? 'vac-marker-root vac-mode-circle vac-marker-pop' : 'vac-marker-root vac-mode-circle';
    rootEl.setAttribute('data-id', vac.id);

    // Inner container for seamless transitions and scaling
    const innerEl = document.createElement('div');
    innerEl.className = 'vac-marker-inner';

    // 1. Ground Anchor Dot (exact 0,0 center)
    const anchorDot = document.createElement('div');
    anchorDot.className = 'vac-anchor-dot';
    anchorDot.style.boxShadow = `0 0 0 1.5px ${vac.color}, 0 1px 3px rgba(0, 0, 0, 0.35)`;
    innerEl.appendChild(anchorDot);

    // 2. Bubble Stem (Container holding the 3 SVG variations with Smart Animate morphing)
    const bubbleStem = document.createElement('div');
    bubbleStem.className = 'vac-bubble-stem';

    // Category dynamic color
    const catColor = vac.color || '#0669D9';

    // SVG 1: Full Pin (ViewBox "0 0 52 80", tip at 26, 77 pointing to ground center)
    const svgFull = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFull.setAttribute('class', 'vac-svg-full');
    svgFull.setAttribute('viewBox', '0 0 52 80');
    svgFull.setAttribute('fill', 'none');
    svgFull.innerHTML = `
      <defs>
        <filter id="f_sh_${vac.id}" x="17.5" y="72" width="17" height="11" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feGaussianBlur stdDeviation="1" result="blur"/>
        </filter>
        <linearGradient id="g_b_${vac.id}" x1="26" y1="1" x2="26" y2="77" gradientUnits="userSpaceOnUse">
          <stop stop-color="white"/>
          <stop offset="1" stop-color="white" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <g filter="url(#f_sh_${vac.id})">
        <ellipse cx="26" cy="77.5" rx="6.5" ry="3.5" fill="black" fill-opacity="0.16"/>
      </g>
      <path d="M26 1C39.8071 1 51 12.1929 51 26C51 31.6469 49.1264 36.8555 45.9688 41.041C40.947 48.035 28 57.0359 28 75C28 76.1046 27.1046 77 26 77C24.8954 77 24 76.1046 24 75C24 57.0355 11.0518 48.0351 6.03027 41.041C2.87288 36.8556 1 31.6467 1 26C1 12.1929 12.1929 1 26 1Z" fill="${catColor}"/>
      <path d="M26 1C39.8071 1 51 12.1929 51 26C51 31.6469 49.1264 36.8555 45.9688 41.041C40.947 48.035 28 57.0359 28 75C28 76.1046 27.1046 77 26 77C24.8954 77 24 76.1046 24 75C24 57.0355 11.0518 48.0351 6.03027 41.041C2.87288 36.8556 1 31.6467 1 26C1 12.1929 12.1929 1 26 1Z" stroke="url(#g_b_${vac.id})" stroke-width="1.2"/>
      <circle cx="26" cy="26" r="21" fill="black" fill-opacity="0.38"/>
    `;

    // SVG 2: Medium Pin (ViewBox "70 43 22 31", tip at 81, 71)
    const svgMedium = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgMedium.setAttribute('class', 'vac-svg-medium');
    svgMedium.setAttribute('viewBox', '70 43 22 31');
    svgMedium.setAttribute('fill', 'none');
    svgMedium.innerHTML = `
      <defs>
        <filter id="f_med_sh_${vac.id}" x="75" y="68" width="12" height="8" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feGaussianBlur stdDeviation="1" result="blur"/>
        </filter>
        <linearGradient id="g_med_${vac.id}" x1="74.77" y1="45" x2="74.77" y2="71" gradientUnits="userSpaceOnUse">
          <stop stop-color="white"/>
          <stop offset="1" stop-color="white" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <g filter="url(#f_med_sh_${vac.id})">
        <ellipse cx="81" cy="72" rx="4" ry="2" fill="black" fill-opacity="0.14"/>
      </g>
      <path d="M81 45C86.5228 45 91 49.4772 91 55C91 58.2858 89.4146 61.2005 86.9678 63.0234C85.083 64.4394 82.387 66.685 81.7715 70.3193C81.7069 70.7008 81.3869 70.9971 81 70.9971C80.6131 70.9971 80.2931 70.7008 80.2285 70.3193C79.6129 66.6846 76.916 64.4394 75.0312 63.0234C72.5848 61.2005 71 58.2855 71 55C71 49.4772 75.4772 45 81 45Z" fill="${catColor}"/>
      <path d="M81 45C86.5228 45 91 49.4772 91 55C91 58.2858 89.4146 61.2005 86.9678 63.0234C85.083 64.4394 82.387 66.685 81.7715 70.3193C81.7069 70.7008 81.3869 70.9971 81 70.9971C80.6131 70.9971 80.2931 70.7008 80.2285 70.3193C79.6129 66.6846 76.916 64.4394 75.0312 63.0234C72.5848 61.2005 71 58.2855 71 55C71 49.4772 75.4772 45 81 45Z" stroke="url(#g_med_${vac.id})" stroke-width="1"/>
      <circle cx="81" cy="55" r="7" fill="black" fill-opacity="0.38"/>
    `;

    // SVG 3: Dot (ViewBox "110 51 17 17")
    const svgDot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDot.setAttribute('class', 'vac-svg-dot');
    svgDot.setAttribute('viewBox', '110 51 17 17');
    svgDot.setAttribute('fill', 'none');
    svgDot.innerHTML = `
      <defs>
        <linearGradient id="g_dot_${vac.id}" x1="113.83" y1="52" x2="113.83" y2="67" gradientUnits="userSpaceOnUse">
          <stop stop-color="white"/>
          <stop offset="1" stop-color="white" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <path d="M118.5 51.5C122.918 51.5 126.5 55.0817 126.5 59.5C126.5 63.9183 122.918 67.5 118.5 67.5C114.082 67.5 110.5 63.9183 110.5 59.5C110.5 55.0817 114.082 51.5 118.5 51.5Z" fill="${catColor}" stroke="url(#g_dot_${vac.id})"/>
      <circle cx="118.5" cy="59.5" r="4.5" fill="black" fill-opacity="0.38"/>
    `;

    // Category Icon: stays strictly vertical billboarded & animated
    const iconWrap = document.createElement('div');
    iconWrap.className = 'vac-icon-wrap';
    iconWrap.innerHTML = getIconSvg(vac.iconType, '#ffffff');

    const clusterWrap = document.createElement('div');
    clusterWrap.className = 'vac-cluster-wrap';
    clusterWrap.style.display = 'none';

    const clusterCount = document.createElement('span');
    clusterCount.className = 'vac-cluster-count';
    clusterWrap.appendChild(clusterCount);

    const dockDot = document.createElement('div');
    dockDot.className = 'vac-dock-dot';

    const needle = document.createElement('div');
    needle.className = 'vac-bubble-needle';

    const bubbleHead = document.createElement('div');
    bubbleHead.className = 'vac-bubble-head';

    bubbleStem.appendChild(svgFull);
    bubbleStem.appendChild(svgMedium);
    bubbleStem.appendChild(svgDot);
    bubbleStem.appendChild(iconWrap);
    bubbleStem.appendChild(clusterWrap);
    bubbleStem.appendChild(dockDot);
    bubbleStem.appendChild(needle);
    bubbleStem.appendChild(bubbleHead);
    innerEl.appendChild(bubbleStem);

    // 3. Bubble Label (Title ONLY below anchor dot, visible ONLY on selection)
    const bubbleLabel = document.createElement('div');
    bubbleLabel.className = 'vac-bubble-label';

    const titleFormatted = formatLocationTitle(vac.locationName);
    bubbleLabel.innerHTML = `
      <div class="vac-label-title">${titleFormatted}</div>
    `;
    innerEl.appendChild(bubbleLabel);

    rootEl.appendChild(innerEl);

    // Add Mapbox Marker — attach lazily when pin enters viewport
    const marker = new mapboxgl.Marker({
      element: rootEl,
      anchor: 'center',
    }).setLngLat([vac.coordinates.lng, vac.coordinates.lat]);

    const item: MarkerItem = {
      id: vac.id,
      marker,
      rootEl,
      innerEl,
      anchorDotEl: anchorDot,
      bubbleStemEl: bubbleStem,
      bubbleHeadEl: bubbleHead,
      needleEl: needle,
      iconWrapEl: iconWrap,
      clusterWrapEl: clusterWrap,
      clusterCountEl: clusterCount,
      dockDotEl: dockDot,
      bubbleLabelEl: bubbleLabel,
      vacancy: vac,
      isSelected: false,
      defaultBackground: catColor,
      defaultBorder: 'none',
      defaultNeedleBorder: 'none',
      state: 'hidden',
      activeCluster: null,
      orderKey: computeOrderKey(vac.id),
      isAttached: false,
      clusterCount: 1,
    };

    // Single robust click/tap listener on rootEl and innerEl
    let touchStartTime = 0;
    const onTouchStart = () => {
      touchStartTime = Date.now();
    };

    const onTrigger = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      // Set global flag to avoid map background click listener from immediately deselecting
      (window as any).__lastMarkerClickTime = Date.now();
      this.handleMarkerClick(item);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (Date.now() - touchStartTime < 350) {
        onTrigger(e);
      }
    };

    bubbleStem.addEventListener('click', onTrigger);
    clusterWrap.addEventListener('click', onTrigger);
    rootEl.addEventListener('click', onTrigger);
    innerEl.addEventListener('click', onTrigger);
    rootEl.addEventListener('touchstart', onTouchStart, { passive: true });
    rootEl.addEventListener('touchend', onTouchEnd);

    return item;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.moveEndHandler) {
      this.map.off('moveend', this.moveEndHandler);
      this.map.off('resize', this.moveEndHandler);
      this.moveEndHandler = null;
    }
    this.markers.forEach((item) => {
      if (item.isAttached) {
        item.marker.remove();
      }
    });
    this.markers.clear();
  }
}


function computeOrderKey(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Green (few vacancies) → red (many vacancies) */
function clusterDensityColor(count: number, maxCount = 16): string {
  const t = Math.min(1, Math.max(0, (count - 1) / (maxCount - 1)));
  const hue = 142 * (1 - t);
  const saturation = 71 + (84 - 71) * t;
  const lightness = 45 + (60 - 45) * t;
  return `hsl(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%)`;
}

function buildScreenClusters(
  items: { item: MarkerItem; pt: mapboxgl.Point; orderKey: number }[],
  radiusPx: number
): ClusterGroup[] {
  const n = items.length;
  if (n === 0) return [];

  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const radiusSq = radiusPx * radiusPx;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = items[i].pt.x - items[j].pt.x;
      const dy = items[i].pt.y - items[j].pt.y;
      if (dx * dx + dy * dy <= radiusSq) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const clusters: ClusterGroup[] = [];
  for (const indices of groups.values()) {
    indices.sort((a, b) => items[a].orderKey - items[b].orderKey);
    const members = indices.map((idx) => items[idx].item);
    const primary = members[0];

    let centerLng = 0;
    let centerLat = 0;
    let centerX = 0;
    let centerY = 0;
    for (const idx of indices) {
      centerLng += items[idx].item.vacancy.coordinates.lng;
      centerLat += items[idx].item.vacancy.coordinates.lat;
      centerX += items[idx].pt.x;
      centerY += items[idx].pt.y;
    }
    const len = members.length;
    centerLng /= len;
    centerLat /= len;
    centerX /= len;
    centerY /= len;

    clusters.push({
      primary,
      members,
      count: len,
      centerLng,
      centerLat,
      centerPt: { x: centerX, y: centerY },
    });
  }

  return clusters;
}

function findNearestCluster(
  pt: mapboxgl.Point,
  clusters: ClusterGroup[]
): ClusterGroup | null {
  let best: ClusterGroup | null = null;
  let bestDist = Infinity;

  for (const group of clusters) {
    if (group.count < 2) continue;
    const dx = pt.x - group.centerPt.x;
    const dy = pt.y - group.centerPt.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = group;
    }
  }

  return bestDist <= 120 * 120 ? best : null;
}


function formatLocationTitle(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2 && parts.length <= 4) {
    const mid = Math.ceil(parts.length / 2);
    return `${parts.slice(0, mid).join(' ')}\n${parts.slice(mid).join(' ')}`;
  }
  return name;
}

function getIconSvg(type: string, color: string): string {
  if (type === 'tree') {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C9.5 2 7.4 3.8 7 6.2C5.3 6.9 4 8.6 4 10.5C4 12.8 5.7 14.7 8 14.9V21C8 21.6 8.4 22 9 22H15C15.6 22 16 21.6 16 21V14.9C18.3 14.7 20 12.8 20 10.5C20 8.6 18.7 6.9 17 6.2C16.6 3.8 14.5 2 12 2Z"/></svg>`;
  }
  if (type === 'coffee') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
  }
  if (type === 'shopping') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
  }
  if (type === 'delivery') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
  }
  if (type === 'laptop') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}

