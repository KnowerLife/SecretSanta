import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiFetch, rememberRoom } from '../../shared/api/client.ts';
import { useI18n } from '../../app/providers/i18n.tsx';
import './demo-room-button.css';

interface DemoRoomResponse {
  ok: boolean;
  code: string;
  token: string;
  memberToken: string;
  inviteToken?: string;
  room?: unknown;
}

/**
 * Creates a server demo room and opens its dashboard.
 * The session token is stored with the same localStorage keys as the regular room flow.
 */
export function DemoRoomButton({
  children,
  className = 'btn btn--primary',
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const openDemo = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const result = await apiFetch<DemoRoomResponse>('/api/rooms/demo', {
        method: 'POST',
        body: {},
      });
      if (!result?.code || !result.token) throw new Error('invalid demo response');
      rememberRoom(result.code, result.token, result.memberToken);
      await navigate({ to: '/room/$code', params: { code: result.code } });
    } catch {
      setError(t('err.network'));
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="site-demo">
      <button
        className={className}
        type="button"
        onClick={() => void openDemo()}
        disabled={pending}
        aria-busy={pending}
      >
        {children ?? t('hero.ctaDemo')}
        {pending ? '…' : ''}
      </button>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
