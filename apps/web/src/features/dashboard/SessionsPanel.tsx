import { useRef, useState } from 'react';
import type { SessionView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { formatTime } from './format.ts';

export function SessionsPanel({
  sessions,
  onRefresh,
  onRevoke,
}: {
  sessions: SessionView[];
  onRefresh: () => void;
  onRevoke: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const revokeTrigger = useRef<HTMLButtonElement>(null);
  const active = sessions.filter((session) => !session.revoked);
  const target = sessions.find((session) => session.id === revokeId);

  return (
    <section className="panel" aria-labelledby="sessions-title">
      <div className="panel__headline">
        <div>
          <h2 id="sessions-title">{t('dash.accessTitle')}</h2>
          <p className="panel__sub">{t('dash.accessSub')}</p>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          aria-label={t('dash.refreshSessions')}
          onClick={onRefresh}
        >
          {t('v69.session.refresh')}
        </button>
      </div>
      {active.length === 0 ? (
        <p className="panel__sub">{t('dash.noSessions')}</p>
      ) : (
        <ul className="list session-list">
          {active.map((session) => (
            <li key={session.id}>
              <span className="session-row">
                <span>
                  <span className="field-hint">{t('v69.session.agent')}</span>
                  <span className="session-row__value">{session.userAgent ?? ''}</span>
                </span>
                <span>
                  <span className="field-hint">{t('v69.session.lastSeen')}</span>
                  <span className="session-row__value">
                    {formatTime(session.lastSeenAt ?? session.createdAt, locale)}
                  </span>
                </span>
                {session.current && <span className="pill">{t('dash.sessionCurrent')}</span>}
              </span>
              <button
                ref={revokeId === session.id ? revokeTrigger : undefined}
                type="button"
                className="btn btn--secondary"
                onClick={() => setRevokeId(session.id)}
              >
                {t('dash.revokeSession')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        opened={revokeId !== null}
        title={t('confirm.title')}
        triggerRef={revokeTrigger}
        onCancel={() => setRevokeId(null)}
        onConfirm={() => {
          const id = revokeId;
          setRevokeId(null);
          if (id) onRevoke(id);
        }}
      >
        <p>
          {t('dash.revokeSession')}: {target?.userAgent ?? ''}
        </p>
      </ConfirmDialog>
    </section>
  );
}
