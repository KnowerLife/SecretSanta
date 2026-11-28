import type { RoomMemberView, RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { daysUntil, formatDate } from './format.ts';

export function ProgressPanel({
  room,
  me,
  drawn,
  online,
}: {
  room: RoomView;
  me?: RoomMemberView;
  drawn: boolean;
  online: boolean;
}) {
  const { t, locale } = useI18n();
  const profileFilled = Object.values(me?.profile ?? {}).some((value) => value.trim().length > 0);
  const checks = [
    { done: room.members.length >= 3, key: 'dash.check1' },
    { done: (me?.wishlist.length ?? 0) > 0, key: 'dash.check2' },
    { done: profileFilled, key: 'dash.check3' },
    { done: drawn, key: 'dash.check4' },
    { done: me?.giftStatus !== 'none' && me?.giftStatus !== undefined, key: 'dash.check5' },
  ];
  const withWishes = room.members.filter((member) => member.wishlist.length > 0).length;
  const giftsReady = room.ready.gifts;
  const total = Math.max(room.members.length, 1);
  const progress = room.members.length === 0
    ? 0
    : Math.round((drawn ? 40 : 0) + (withWishes / total) * 30 + (giftsReady / total) * 30);

  const days = daysUntil(room.eventDate);
  const countdown = days === null
    ? ''
    : days > 1
      ? t('dash.daysLeft', { n: days })
      : days === 1
        ? t('dash.daysTomorrow')
        : days === 0
          ? t('dash.daysToday')
          : t('dash.daysPast', { n: Math.abs(days) });

  return (
    <section className="panel progress-panel" aria-labelledby="progress-title">
      <div className="panel__headline">
        <div>
          <h2 id="progress-title">{t('v69.progress.title')}</h2>
          <p className="panel__sub">{t('dash.statusSub')}</p>
        </div>
        {countdown && <span className="pill progress-panel__countdown">{countdown}</span>}
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-label={t('dash.statusTitle')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span className="progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="field-hint">{t('dash.progressLabel')}: {progress}%</p>

      <ul className="checklist">
        {checks.map((check) => (
          <li key={check.key} data-done={check.done}>
            <span className="checklist__mark" aria-hidden="true">{check.done ? '✓' : '○'}</span>
            <span>{t(check.key)}</span>
          </li>
        ))}
        {checks.every((check) => check.done) && (
          <li className="checklist__done animated pulse motion-cheer">{t('dash.checkAllDone')}</li>
        )}
      </ul>

      <div className="meta-grid">
        <span className="pill">{t('dash.budget', { min: room.budgetMin, max: room.budgetMax })}</span>
        {room.eventDate && (
          <span className="pill">{t('dash.date', { date: formatDate(room.eventDate, locale) })}</span>
        )}
        <span className="pill">{t(`theme.${room.theme}`)}</span>
        <span className="pill">{t('dash.statusPlayers')}: {room.ready.members}</span>
        <span className="pill">{t('dash.statusWishlists')}: {room.ready.wishlists}</span>
        <span className="pill">{t('dash.statusGifts')}: {room.ready.gifts}</span>
        <span className="pill">{t('dash.statusDraw')}: {t(drawn ? 'dash.statusDrawYes' : 'dash.statusDrawNo')}</span>
        <span className="pill" data-online={online}>
          {t(online ? 'dash.backendOnline' : 'dash.backendOffline')}
        </span>
      </div>
    </section>
  );
}
