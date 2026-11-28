/** Базовый путь приложения: '/' локально и '/<repo>' на GitHub Pages. */

const ENV = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};

const SEGMENT = (ENV.VITE_PAGES_BASE ?? '').replace(/^\/+|\/+$/g, '');

/** TanStack Router ожидает базу без завершающего слеша. */
export const BASE_PATH = SEGMENT ? `/${SEGMENT}` : '/';

const ASSET_BASE = SEGMENT ? `${BASE_PATH}/` : '/';

/** Путь к публичному ассету с учётом базового пути. */
export function assetPath(path: string): string {
  return `${ASSET_BASE}${path.replace(/^\/+/, '')}`;
}

/** Статическая витрина на GitHub Pages: серверных комнат здесь нет. */
export const PAGES_MODE = ENV.VITE_PAGES_MODE === '1';
