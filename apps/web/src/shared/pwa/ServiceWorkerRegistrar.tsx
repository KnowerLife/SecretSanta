import { useEffect, useState } from 'react';
import { useI18n } from '../../app/providers/i18n.tsx';
import { flushQueue } from './offlineQueue.ts';
import { apiFetch } from '../api/client.ts';

export function ServiceWorkerRegistrar() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    if (!navigator.onLine) setOffline(true);
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
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
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [t]);

  return (
    <>
      {offline ? (
        <div className="offline-banner" role="status">
          {t('nav.offline')}
        </div>
      ) : null}
      {message && <div className="notice" data-kind="success">{message}</div>}
    </>
  );
}
