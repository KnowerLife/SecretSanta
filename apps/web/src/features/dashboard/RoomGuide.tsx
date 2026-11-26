import type { RoomMemberView, RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import type { Tab } from './types.ts';

const STEPS = [
  { id: 'team', title: 'guide.room.1.title', text: 'guide.room.1.text', tip: 'guide.room.1.tip', cta: 'guide.room.1.cta' },
  { id: 'wishes', title: 'guide.room.2.title', text: 'guide.room.2.text', tip: 'guide.room.2.tip', cta: 'guide.room.2.cta' },
  { id: 'profile', title: 'guide.room.3.title', text: 'guide.room.3.text', tip: 'guide.room.3.tip', cta: 'guide.room.3.cta' },
  { id: 'draw', title: 'guide.room.4.title', text: 'guide.room.4.text', tip: 'guide.room.4.tip', cta: 'guide.room.4.cta', doneCta: 'guide.room.4.doneCta' },
  { id: 'gift', title: 'guide.room.5.title', text: 'guide.room.5.text', tip: 'guide.room.5.tip', cta: 'guide.room.5.cta' },
] as const;

function isDone(id: string, room: RoomView, me?: RoomMemberView, drawn = false): boolean {
  if (id === 'team') return room.members.length >= 3;
  if (id === 'wishes') return (me?.wishlist.length ?? 0) > 0;
  if (id === 'profile') {
    return Object.values(me?.profile ?? {}).some((value) => value.trim().length > 0);
  }
  if (id === 'draw') return drawn;
  if (id === 'gift') return me?.giftStatus === 'bought' || me?.giftStatus === 'done';
  return false;
}

function focus(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0);
}

export function RoomGuide({
  room,
  me,
  drawn,
  step,
  onStepChange,
  onGo,
  onReveal,
}: {
  room: RoomView;
  me?: RoomMemberView;
  drawn: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onGo: (tab: Tab, focusId?: string) => void;
  onReveal: () => void;
}) {
  const { t } = useI18n();
  const done = STEPS.map((item) => isDone(item.id, room, me, drawn));
  const active = Math.max(0, Math.min(step, STEPS.length - 1));
  const current = STEPS[active]!;
  const ctaKey = current.id === 'draw' && drawn ? current.doneCta : current.cta;

  const go = () => {
    if (current.id === 'team') onGo('access');
    if (current.id === 'wishes') onGo('overview', 'wish-input');
    if (current.id === 'profile') onGo('overview', 'profile-antiWishlist');
    if (current.id === 'draw') {
      if (drawn) {
        onReveal();
        onGo('overview');
      } else {
        onGo('overview', 'draw-btn');
      }
    }
    if (current.id === 'gift') onGo('overview', 'gift-status-none');
  };

  return (
    <section className="panel guide" aria-labelledby="room-guide-title">
      <span className="kicker">{t('guide.room.kicker')}</span>
      <h2 id="room-guide-title">{t('guide.room.title')}</h2>
      <p className="panel__sub guide__progress">
        {done.every(Boolean) ? t('guide.allDone') : `${done.filter(Boolean).length} / ${STEPS.length}`}
      </p>
      <div className="guide__layout">
        <div className="guide__rail" role="tablist" aria-label={t('guide.railAria')}>
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls="room-guide-detail"
              className="guide__step"
              data-active={index === active}
              data-done={done[index]}
              onClick={() => onStepChange(index)}
            >
              <span className="guide__mark" aria-hidden="true">{done[index] ? '✓' : index + 1}</span>
              <span>{t(item.title)}</span>
            </button>
          ))}
        </div>
        <div className="guide__detail" id="room-guide-detail" role="tabpanel">
          <h3>{t(current.title)}</h3>
          <p>{t(current.text)}</p>
          <p className="guide__tip">{t(current.tip)}</p>
          <div className="btn-row guide__actions">
            <button type="button" className="btn btn--primary" onClick={go}>
              {t(ctaKey)}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export { focus as focusElement };
