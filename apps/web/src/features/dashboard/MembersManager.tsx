import { useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { RoomMemberView, RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import type { Mutation } from './types.ts';

export function MembersManager({
  code,
  room,
  me,
  canManage,
  mutate,
}: {
  code: string;
  room: RoomView;
  me?: RoomMemberView;
  canManage: boolean;
  mutate: Mutation;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removeTrigger = useRef<HTMLButtonElement>(null);

  const target = room.members.find((member) => member.id === removeId);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (room.members.some((member) => member.name === trimmed)) {
      notifications.show({ message: t('toast.participantExists'), color: 'red', autoClose: 4000 });
      return;
    }
    const ok = await mutate(`/api/rooms/${code}/members`, { name: trimmed }, 'POST');
    if (ok) {
      setName('');
      notifications.show({ message: t('toast.participantAdded'), color: 'green', autoClose: 3500 });
    }
  };

  const remove = async () => {
    const member = target;
    setRemoveId(null);
    if (!member) return;
    const ok = await mutate(`/api/rooms/${code}/members/${encodeURIComponent(member.id)}`, undefined, 'DELETE');
    if (ok) {
      notifications.show({
        message: t('toast.participantRemoved', { name: member.name }),
        color: 'green',
        autoClose: 3500,
      });
    }
  };

  return (
    <section className="panel" aria-labelledby="members-title">
      <h2 id="members-title">{t('dash.participantsTitle')}</h2>
      <p className="panel__sub">{t('dash.participantsSub')}</p>
      {canManage && (
        <div className="form-inline">
          <input
            aria-label={t('dash.participantsPh')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('dash.participantsPh')}
          />
          <button type="button" className="btn btn--primary" onClick={() => void add()}>
            {t('dash.participantsAdd')}
          </button>
        </div>
      )}
      <ul className="list">
        {room.members.map((member) => (
          <li key={member.id}>
            <span className="member-row">
              <strong>{member.name}</strong>
              {member.role === 'organizer' && <span className="pill">{t('dash.participantOrganizer')}</span>}
              <span className="pill">{t(`dash.gift.${member.giftStatus}`)}</span>
              <span className="pill">{t('dash.participantWishes', { n: member.wishlist.length })}</span>
            </span>
            {canManage && member.role !== 'organizer' && member.id !== me?.id && (
              <button
                ref={removeId === member.id ? removeTrigger : undefined}
                type="button"
                className="btn btn--secondary"
                onClick={() => setRemoveId(member.id)}
              >
                {t('dash.participantRemove')}
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        opened={removeId !== null}
        title={t('v69.confirm.memberRemove')}
        triggerRef={removeTrigger}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => void remove()}
      >
        <p>{target?.name ?? ''}</p>
      </ConfirmDialog>
    </section>
  );
}
