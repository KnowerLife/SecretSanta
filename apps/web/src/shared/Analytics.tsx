import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { ANALYTICS_ENABLED, trackPageview } from './analytics.ts';

/** Sends one cookieless pageview per public showcase route change. */
export function PrivacyAnalytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (ANALYTICS_ENABLED) trackPageview(pathname);
  }, [pathname]);

  return null;
}
