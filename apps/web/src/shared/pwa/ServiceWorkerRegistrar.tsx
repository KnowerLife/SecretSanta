import { useEffect, useState } from 'react';
import { useI18n } from '../../app/providers/i18n.tsx';
import { LOCAL_MODE_EVENT, apiFetch, hasDirtyRooms, isLocalMode } from '../api/client.ts';
import { flushQueue } from './offlineQueue.ts';

export function ServiceWorkerRegistrar() {
  const { t, locale } = useI18n();
  const [offline, setOffline] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    setOffline(!navigator.onLine);
    setLocalMode(isLocalMode());

    const onOffline = () => {
      setOffline(true);
      setLocalMode(isLocalMode());
    };
    const onOnline = () => {
      setOffline(false);
      setLocalMode(isLocalMode());
      setMessage(t('nav.online'));
      window.setTimeout(() => setMessage(''), 4000);
      // При наличии локальных изменений выбор за пользователем (LocalSyncPrompt).
      if (isLocalMode() || hasDirtyRooms()) return;
      void flushQueue((request) =>
        apiFetch(request.path, {
          method: 'POST',
          body: request.body,
          token: request.token,
        }).then(() => undefined),
      ).then(({ sent }) => {
        if (sent > 0) {
          setMessage(t('toast.queueSent'));
          window.setTimeout(() => setMessage(''), 4000);
        }
      });
    };
    const onModeChange = () => setLocalMode(isLocalMode());

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener(LOCAL_MODE_EVENT, onModeChange);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(LOCAL_MODE_EVENT, onModeChange);
    };
    // `t` меняется вместе с locale — баннер и уведомления обновляются без перезагрузки.
  }, [t, locale]);

  const banner = offline
    ? t('nav.offline')
    : localMode
      ? t('toast.backendOffline')
      : '';

  return (
    <>
      {banner && <div className="offline-banner" role="status">{banner}</div>}
      {message && <div className="notice" data-kind="success">{message}</div>}
    </>
  );
}
