import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { RoomTheme } from '@secret-santa/shared/contracts';
import { notifications } from '@mantine/notifications';
import { apiFetch, rememberRoom } from '../../shared/api/client.ts';
import { useI18n } from '../../app/providers/i18n.tsx';

const ROOM_THEMES = ['winter', 'midnight', 'cozy'] as const satisfies readonly RoomTheme[];

interface CreatedRoom {
  code: string;
  token: string;
  memberToken: string;
  inviteToken: string;
}

export function CreateRoomForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [budgetMin, setBudgetMin] = useState('0');
  const [budgetMax, setBudgetMax] = useState('0');
  const [theme, setTheme] = useState<RoomTheme>('winter');
  const [members, setMembers] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !organizerName.trim()) {
      setError(t('err.createRequired'));
      return;
    }
    if (!eventDate.trim()) {
      setError(t('err.createDate'));
      return;
    }
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      setError(t('err.createBudget'));
      return;
    }
    setPending(true);
    try {
      const result = await apiFetch<CreatedRoom>('/api/rooms', {
        method: 'POST',
        body: {
          name: name.trim(),
          organizerName: organizerName.trim(),
          eventDate: eventDate.trim(),
          budgetMin: Math.round(min),
          budgetMax: Math.round(max),
          theme,
          memberNames: members
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      rememberRoom(result.code, result.token, result.memberToken);
      notifications.show({ message: t('toast.created'), color: 'green', autoClose: 3500 });
      await navigate({ to: '/room/$code', params: { code: result.code } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('err.network'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <span className="kicker">{t('create.kicker')}</span>
      <h1>{t('create.title')}</h1>
      <p className="form-card__sub">{t('create.sub')}</p>

      <div className="field">
        <label htmlFor="game-name">{t('create.gameName')}</label>
        <input
          id="game-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('create.gameNamePh')}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="organizer-name">{t('create.organizerName')}</label>
        <input
          id="organizer-name"
          value={organizerName}
          onChange={(event) => setOrganizerName(event.target.value)}
          placeholder={t('create.organizerNamePh')}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="event-date">{t('create.eventDate')}</label>
        <input
          id="event-date"
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>{t('create.budget')}</label>
        <div className="budget-row">
          <input
            aria-label={t('create.budgetMin')}
            type="number"
            min="0"
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
            placeholder={t('create.budgetMin')}
          />
          <input
            aria-label={t('create.budgetMax')}
            type="number"
            min="0"
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
            placeholder={t('create.budgetMax')}
          />
        </div>
      </div>
      <div className="field">
        <span className="field-label" id="room-theme-label">{t('create.theme')}</span>
        <div className="theme-picker" role="group" aria-labelledby="room-theme-label">
          {ROOM_THEMES.map((value) => (
            <button
              key={value}
              type="button"
              className="theme-option"
              data-theme-option={value}
              aria-pressed={theme === value}
              aria-label={t(`theme.${value}`)}
              onClick={() => setTheme(value)}
            >
              <span className="theme-option__swatch" aria-hidden="true" />
              <span>{t(`theme.short.${value}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="member-names">
          {t('dash.participantsTitle')} <span className="field-hint">{t('create.optional')}</span>
        </label>
        <textarea
          id="member-names"
          aria-label={t('participant.label')}
          value={members}
          onChange={(event) => setMembers(event.target.value)}
          placeholder={t('quick.namesPh')}
        />
        <p className="field-hint">{t('quick.namesHint')}</p>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="btn-row">
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {t('create.submit')}
        </button>
        <a className="btn btn--secondary" href="/">{t('create.cancel')}</a>
      </div>
    </form>
  );
}
