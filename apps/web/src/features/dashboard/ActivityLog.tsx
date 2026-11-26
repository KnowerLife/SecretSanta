import type { ActivityView, RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import type { Translate } from '../../app/providers/i18n.tsx';
import { Scene } from '../../shared/ui/Scene.tsx';
import { formatTime } from './format.ts';

const GIFTS = ['none', 'idea', 'bought', 'done'];

function payloadOf(event: ActivityView): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object'
    ? (event.payload as Record<string, unknown>)
    : {};
}

function sentence(event: ActivityView, room: RoomView, t: Translate): string {
  const payload = payloadOf(event);
  const actor = event.actorName ?? (typeof payload.name === 'string' ? payload.name : '');
  const name = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

  switch (event.type) {
    case 'room.created':
      return t('dash.evt.created', { name: name(payload.name, room.name) });
    case 'room.member_joined':
      return t('dash.evt.joined', { name: actor });
    case 'room.wishlist_updated':
      return t('dash.evt.wishlist', { name: actor });
    case 'room.gift_status':
    case 'room.gift_status_updated': {
      const status = name(payload.status, name(payload.giftStatus, 'none'));
      const label = t(`dash.gift.${GIFTS.includes(status) ? status : 'none'}`);
      return t('dash.evt.status', { name: actor, status: label });
    }
    case 'room.profile_updated':
      return t('dash.evt.profile', { name: actor });
    case 'room.exclusion_added':
      return t('dash.evt.exclusionAdded');
    case 'room.exclusion_removed':
      return t('dash.evt.exclusionRemoved');
    case 'room.group_added':
      return t('dash.evt.groupAdded', { name: name(payload.name, name(payload.groupName)) });
    case 'room.group_removed':
      return t('dash.evt.groupRemoved', { name: name(payload.name, name(payload.groupName)) });
    case 'room.drawn': {
      const count = Number(payload.pairs ?? payload.memberCount ?? room.members.length);
      return t('dash.evt.drawDone', { n: Number.isFinite(count) ? count : room.members.length });
    }
    case 'room.draw_reset':
      return t('dash.evt.drawReset');
    case 'room.message':
      return t('dash.evt.message');
    default:
      return t('dash.evt.unknown');
  }
}

export function ActivityLog({ room, events }: { room: RoomView; events: ActivityView[] }) {
  const { t, locale } = useI18n();

  return (
    <section className="panel" aria-labelledby="activity-title">
      <h2 id="activity-title">{t('dash.activityTitle')}</h2>
      <p className="panel__sub">{t('dash.activitySub')}</p>
      {room.demo && <p className="field-hint">{t('dash.activityDemo')}</p>}
      {events.length === 0 ? (
        <div className="empty-state">
          <Scene id="activity-empty" />
          <p>{t('dash.activityEmpty')}</p>
        </div>
      ) : (
        <ul className="list activity-list">
          {events.map((event) => (
            <li key={event.id} className="activity-item">
              <span className="activity-item__dot" aria-hidden="true" />
              <span className="activity-item__body">
                <strong>{sentence(event, room, t)}</strong>
                <span className="activity-item__meta">
                  {event.actorName && <span className="pill">{event.actorName}</span>}
                  <span className="field-hint">{formatTime(event.createdAt, locale)}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
