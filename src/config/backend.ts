/**
 * Backend URLs from Vite env.
 * Local: `.env` and `.env.development` (dev proxy /cms and /api → Strapi).
 * Vercel production: VITE_* from the project dashboard, not from env files.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const readEnv = (key: keyof ImportMetaEnv): string | undefined => {
  const value = import.meta.env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveUrl = (envKey: keyof ImportMetaEnv, devFallback: string): string => {
  const fromEnv = readEnv(envKey);
  if (fromEnv) return trimTrailingSlash(fromEnv);
  if (import.meta.env.DEV) return trimTrailingSlash(devFallback);
  return '';
};

export const backendConfig = {
  /** Strapi (halty-backend). Dev default: `/cms` → Vite proxy :1337 */
  strapiUrl: resolveUrl('VITE_STRAPI_URL', '/cms'),

  /** Same Strapi REST API. Dev default: `/api` → Vite proxy :1337 */
  nodeApiBase: resolveUrl('VITE_API_BASE_URL', '/api'),

  /**
   * WebSocket URL. If empty — built from current page host + VITE_WS_PATH (dev: /ws).
   */
  wsUrl: readEnv('VITE_WS_URL') ?? '',

  wsPath: trimTrailingSlash(readEnv('VITE_WS_PATH') ?? '/ws'),

  useStrapiApi: import.meta.env.VITE_USE_STRAPI !== 'false',

  enableNodeWs: false,

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

/** WebSocket endpoint for apiClient (explicit URL or same-origin path). */
export function resolveWebSocketUrl(): string {
  if (backendConfig.wsUrl) return backendConfig.wsUrl;

  if (typeof window === 'undefined') return backendConfig.wsPath;

  const path = backendConfig.wsPath.startsWith('/')
    ? backendConfig.wsPath
    : `/${backendConfig.wsPath}`;

  const isHttps = window.location.protocol === 'https:';
  return `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}${path}`;
}

export type BackendConfig = typeof backendConfig;
