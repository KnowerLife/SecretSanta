import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiFetch, rememberRoom } from '../../shared/api/client.ts';
import { useI18n } from '../../app/providers/i18n.tsx';

interface JoinedRoom {
  code: string;
  token: string;
  memberToken: string;
}

export function JoinRoomForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) setInviteToken(invite);
    const roomCode = params.get('code');
    if (roomCode) setCode(roomCode.toUpperCase());
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!code.trim() || !name.trim()) {
      setError(t('err.joinRequired'));
      return;
    }
    setPending(true);
    try {
      const result = await apiFetch<JoinedRoom>('/api/rooms/join', {
        method: 'POST',
        body: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          inviteToken: inviteToken || undefined,
        },
      });
      rememberRoom(result.code, result.token, result.memberToken);
      await navigate({ to: '/room/$code', params: { code: result.code } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('err.network'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <span className="kicker">{t('join.kicker')}</span>
      <h1>{t('join.title')}</h1>
      <p className="form-card__sub">{t('join.sub')}</p>

      <div className="field">
        <label htmlFor="join-code">{t('join.code')}</label>
        <input
          id="join-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t('join.codePh')}
          required
        />
        <p className="field-hint">{t('join.codeHint')}</p>
      </div>
      <div className="field">
        <label htmlFor="join-name">{t('join.name')}</label>
        <input
          id="join-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('join.namePh')}
          required
        />
      </div>
      {inviteToken && <p className="notice" data-kind="success">{t('dash.inviteBtn')}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="btn-row">
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {t('join.submit')}
        </button>
      </div>
    </form>
  );
}
