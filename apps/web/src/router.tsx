import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { BASE_PATH } from './shared/base.ts';

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: BASE_PATH,
    scrollRestoration: true,
    defaultPreload: 'intent',
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
