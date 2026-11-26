import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../app/providers/i18n.tsx';
import {
  LOCAL_MODE_EVENT,
  dirtyRoomCodes,
  flushLocalOutbox,
  hasDirtyRooms,
  isApiAvailable,
  keepLocalOnly,
  setLocalMode,
} from '../../shared/api/client.ts';
import './local-play.css';

export interface LocalSyncState {
  open: boolean;
  codes: string[];
  busy: boolean;
  errorKey: string | null;
  statusKey: string | null;
  sync: () => Promise<void>;
  keep: () => void;
  dismiss: () => void;
}

/**
 * Явный выбор после восстановления сети: отправить локальные изменения или
 * оставить их только в браузере. Ничего не перезаписывается автоматически.
 */
export function useLocalSyncPrompt(): LocalSyncState {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [statusKey, setStatusKey] = useState<string | null>(null);

  const maybeOpen = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const dirty = dirtyRoomCodes();
    if (dirty.length === 0) return;
    setCodes(dirty);
    setErrorKey(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    maybeOpen();
    const onOnline = () => {
      void isApiAvailable(true).then(() => maybeOpen());
    };
    window.addEventListener('online', onOnline);
    window.addEventListener(LOCAL_MODE_EVENT, maybeOpen);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(LOCAL_MODE_EVENT, maybeOpen);
    };
  }, [maybeOpen]);

  const sync = useCallback(async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      const result = await flushLocalOutbox();
      if (result.pending > 0) {
        setErrorKey('err.network');
        return;
      }
      // Локально созданную комнату некуда отправить — данные остаются в браузере.
      if (result.sent === 0 && hasDirtyRooms()) {
        setOpen(false);
        setStatusKey('v69.local.saved');
        return;
      }
      setLocalMode(false);
      setOpen(false);
      setStatusKey('toast.backendOnline');
    } catch {
      setErrorKey('err.network');
    } finally {
      setBusy(false);
    }
  }, []);

  const keep = useCallback(() => {
    keepLocalOnly();
    setLocalMode(true);
    setOpen(false);
    setErrorKey(null);
    setStatusKey('v69.local.saved');
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, codes, busy, errorKey, statusKey, sync, keep, dismiss };
}

/** Компонент можно смонтировать в любом месте; по умолчанию он уже смонтирован в SiteHeader. */
export function LocalSyncPrompt({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const { open, codes, busy, errorKey, statusKey, sync, keep } = useLocalSyncPrompt();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (!open) {
    return statusKey ? (
      <div className={`local-sync local-sync--compact ${className}`} role="status">
        <p className="local-sync__text">{t(statusKey)}</p>
      </div>
    ) : null;
  }

  return (
    <section
      className={`local-sync ${className}`}
      role="dialog"
      aria-label={t('v69.local.syncTitle')}
    >
      <h2 className="local-sync__title" ref={headingRef} tabIndex={-1}>
        {t('v69.local.syncTitle')}
      </h2>
      <p className="local-sync__text">
        {t('v69.offline.banner')}
        {codes.length > 0 ? ` (${codes.join(', ')})` : ''}
      </p>
      {errorKey && <p className="local-sync__error" role="alert">{t(errorKey)}</p>}
      <div className="local-sync__actions">
        <button className="btn btn--primary" type="button" disabled={busy} onClick={() => void sync()}>
          {t('v69.local.syncSend')}
        </button>
        <button className="btn btn--secondary" type="button" disabled={busy} onClick={keep}>
          {t('v69.local.syncKeep')}
        </button>
      </div>
    </section>
  );
}
