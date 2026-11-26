import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { apiFetch } from '../../shared/api/client.ts';
import { formatDate } from './format.ts';

export function InvitePanel({ code, room }: { code: string; room: RoomView }) {
  const { t, locale } = useI18n();
  const [inviteToken, setInviteToken] = useState('');
  const [pending, setPending] = useState(false);

  const link = inviteToken && typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${encodeURIComponent(code)}&invite=${encodeURIComponent(inviteToken)}`
    : '';

  const text = [
    t('dash.inviteGreeting', { name: room.name }),
    (room.budgetMin || room.budgetMax)
      ? t('dash.inviteBudget', { min: room.budgetMin, max: room.budgetMax })
      : '',
    room.eventDate ? t('dash.inviteDate', { date: formatDate(room.eventDate, locale) }) : '',
    t('dash.inviteJoin', { url: link }),
    t('dash.inviteCode', { code }),
  ].filter(Boolean).join('\n');

  const create = async () => {
    setPending(true);
    try {
      const result = await apiFetch<{ inviteToken: string }>(`/api/rooms/${code}/invites`, {
        method: 'POST',
        body: { role: 'participant', maxUses: 10 },
        code,
      });
      setInviteToken(result.inviteToken);
    } catch {
      notifications.show({
        message: t('err.network'),
        color: 'red',
        autoClose: 4000,
      });
    } finally {
      setPending(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notifications.show({ message: t('toast.copiedLink'), color: 'green', autoClose: 3000 });
    } catch {
      notifications.show({ message: t('err.network'), color: 'red', autoClose: 4000 });
    }
  };

  const message = `${text}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
  const whatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  const email = `mailto:?subject=${encodeURIComponent(t('dash.inviteGreeting', { name: room.name }))}&body=${encodeURIComponent(message)}`;

  return (
    <section className="panel" aria-labelledby="invite-title">
      <h2 id="invite-title">{t('dash.inviteBtn')}</h2>
      <p className="panel__sub">{t('dash.accessSub')}</p>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={pending} onClick={() => void create()}>
          {t('dash.inviteBtn')}
        </button>
        {link && (
          <button type="button" className="btn btn--secondary" onClick={() => void copy(link)}>
            {t('dash.copyLink')}
          </button>
        )}
      </div>

      {link && (
        <div className="invite-result">
          <label className="field" htmlFor="invite-text">
            <span>{t('dash.inviteTextLabel')}</span>
            <textarea id="invite-text" value={text} readOnly rows={6} />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--secondary"
              aria-label={t('dash.copyAria')}
              onClick={() => void copy(text)}
            >
              {t('dash.inviteCopy')}
            </button>
          </div>
          <h3>{t('v69.invite.share')}</h3>
          <div className="btn-row" role="group" aria-label={t('v69.invite.share')}>
            <a className="btn btn--secondary" href={telegram} target="_blank" rel="noreferrer">Telegram</a>
            <a className="btn btn--secondary" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn btn--secondary" href={email}>Email</a>
          </div>
          <p className="field-hint">{link}</p>
        </div>
      )}
    </section>
  );
}
