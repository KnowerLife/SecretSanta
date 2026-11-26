import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../app/providers/i18n.tsx';
import {
  getStoredSubscription,
  isPushEnabled,
  isPushSupported,
  sendTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../shared/api/client.ts';
import './local-play.css';

export interface PushControlsOptions {
  code: string;
  memberId?: string;
}

export interface PushControlsState {
  enabled: boolean;
  supported: boolean;
  busy: boolean;
  statusKey: string;
  noticeKey: string | null;
  errorKey: string | null;
  toggle: () => Promise<void>;
  test: () => Promise<void>;
}

/** Состояние подписки хранится в localStorage и обновляется при смене комнаты. */
export function usePushControls({ code, memberId }: PushControlsOptions): PushControlsState {
  const [enabled, setEnabled] = useState(() => isPushSupported() && isPushEnabled(code));
  const [busy, setBusy] = useState(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(isPushSupported() && Boolean(getStoredSubscription(code)));
  }, [code]);

  const toggle = useCallback(async () => {
    setBusy(true);
    setNoticeKey(null);
    setErrorKey(null);
    try {
      if (enabled) {
        await unsubscribeFromPush(code);
        setEnabled(false);
        setNoticeKey('v69.push.off');
      } else {
        await subscribeToPush(code, memberId);
        setEnabled(true);
        setNoticeKey('v69.push.on');
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setErrorKey(message === 'push_not_enabled' ? 'v69.push.enable' : 'v69.push.error');
    } finally {
      setBusy(false);
    }
  }, [code, enabled, memberId]);

  const test = useCallback(async () => {
    setNoticeKey(null);
    setErrorKey(null);
    if (!enabled) {
      setErrorKey('v69.push.enable');
      return;
    }
    setBusy(true);
    try {
      await sendTestNotification(code);
      setNoticeKey('v69.push.testOk');
    } catch {
      setErrorKey('v69.push.error');
    } finally {
      setBusy(false);
    }
  }, [code, enabled]);

  return {
    enabled,
    supported: isPushSupported(),
    busy,
    statusKey: enabled ? 'v69.push.on' : 'v69.push.off',
    noticeKey,
    errorKey,
    toggle,
    test,
  };
}

/** Можно смонтировать в дашборде: <PushControls code={code} memberId={me.id} />. */
export function PushControls({ code, memberId, className = '' }: PushControlsOptions & { className?: string }) {
  const { t } = useI18n();
  const { enabled, supported, busy, statusKey, noticeKey, errorKey, toggle, test } = usePushControls({ code, memberId });

  return (
    <section className={`push-controls ${className}`} aria-label={t('v69.push.title')}>
      <p className="push-controls__status" aria-live="polite">{t(statusKey)}</p>
      <p className="panel__sub">{t('v69.push.body')}</p>
      {supported && (
        <>
          <button className="btn btn--primary" type="button" disabled={busy} onClick={() => void toggle()}>
            {t(enabled ? 'v69.push.disable' : 'v69.push.enable')}
          </button>
          {enabled && (
            <>
              <button
                className="btn btn--secondary"
                type="button"
                disabled={busy}
                title={t('v69.push.testTitle')}
                onClick={() => void test()}
              >
                {t('v69.push.test')}
              </button>
              <p className="field-hint">{t('v69.push.testMessage')}</p>
            </>
          )}
        </>
      )}
      {noticeKey && <p className="push-controls__notice" role="status">{t(noticeKey)}</p>}
      {errorKey && <p className="push-controls__error" role="alert">{t(errorKey)}</p>}
    </section>
  );
}
