import { useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { RoomMemberView, RoomView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import type { Mutation } from './types.ts';

interface ExclusionGroup {
  name: string;
  memberIds: string[];
  pairs: number;
}

function deriveGroups(room: RoomView): ExclusionGroup[] {
  const groups = new Map<string, ExclusionGroup>();
  for (const item of room.exclusions) {
    if (!item.groupName) continue;
    const group = groups.get(item.groupName) ?? { name: item.groupName, memberIds: [], pairs: 0 };
    if (!group.memberIds.includes(item.memberA)) group.memberIds.push(item.memberA);
    if (!group.memberIds.includes(item.memberB)) group.memberIds.push(item.memberB);
    group.pairs += 1;
    groups.set(item.groupName, group);
  }
  return [...groups.values()];
}

export function GroupsManager({
  code,
  room,
  members,
  drawn,
  mutate,
}: {
  code: string;
  room: RoomView;
  members: RoomMemberView[];
  drawn: boolean;
  mutate: Mutation;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [minusA, setMinusA] = useState('');
  const [minusB, setMinusB] = useState('');
  const [removeGroup, setRemoveGroup] = useState<string | null>(null);
  const removeTrigger = useRef<HTMLButtonElement>(null);

  const groups = useMemo(() => deriveGroups(room), [room.exclusions]);
  const manual = room.exclusions.filter((item) => !item.groupName);
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? '';

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const createGroup = async () => {
    if (!name.trim() || selected.length < 2) {
      notifications.show({ message: t('dash.groupsNeed'), color: 'red', autoClose: 4000 });
      return;
    }
    const ok = await mutate(`/api/rooms/${code}/groups`, {
      name: name.trim(),
      memberIds: selected,
    }, 'POST', 'dash.groupsCreated');
    if (ok) {
      setName('');
      setSelected([]);
    }
  };

  const addManual = async () => {
    if (!minusA || !minusB || minusA === minusB) {
      notifications.show({ message: t('dash.exclusionsSame'), color: 'red', autoClose: 4000 });
      return;
    }
    const ok = await mutate(`/api/rooms/${code}/exclusions`, {
      memberA: minusA,
      memberB: minusB,
    }, 'POST', 'dash.exclusionsAdded');
    if (ok) {
      setMinusA('');
      setMinusB('');
    }
  };

  return (
    <section className="panel" aria-labelledby="groups-title">
      <h2 id="groups-title">{t('dash.groupsTitle')}</h2>
      <p className="panel__sub">{t('dash.groupsSub')}</p>

      <div className="group-form" data-locked={drawn}>
        <label className="field">
          <span>{t('dash.groupsNamePh')}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('dash.groupsNamePh')}
            disabled={drawn}
          />
        </label>
        <p className="field-hint">{t('dash.groupsHint')}</p>
        <div className="group-checks">
          {members.map((member) => (
            <label className="group-check" key={member.id}>
              <input
                type="checkbox"
                checked={selected.includes(member.id)}
                disabled={drawn}
                onChange={() => toggle(member.id)}
              />
              <span>{member.name}</span>
            </label>
          ))}
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={drawn}
            onClick={() => void createGroup()}
          >
            {t('dash.groupsAdd')}
          </button>
        </div>
        {drawn && <p className="field-hint">{t('dash.groupsLocked')}</p>}
      </div>

      <ul className="list group-list">
        {groups.length === 0 ? (
          <li>{t('dash.groupsNone')}</li>
        ) : (
          groups.map((group) => (
            <li key={group.name}>
              <span className="group-list__body">
                <strong>{group.name}</strong>
                <span className="pill">{t('dash.groupsCount', { n: group.memberIds.length })}</span>
                <span className="pill" aria-label={t('dash.exclusionsTitle')}>{group.pairs}</span>
                <span className="field-hint">{group.memberIds.map(nameOf).join(', ')}</span>
              </span>
              <button
                ref={removeGroup === group.name ? removeTrigger : undefined}
                type="button"
                className="btn btn--secondary"
                disabled={drawn}
                onClick={() => setRemoveGroup(group.name)}
              >
                {t('dash.exclusionsRemove')}
              </button>
            </li>
          ))
        )}
      </ul>

      <h3>{t('dash.exclusionsTitle')}</h3>
      <p className="panel__sub">{t('dash.exclusionsSub')}</p>
      <div className="form-inline">
        <select aria-label={t('dash.exclusionsA')} value={minusA} onChange={(event) => setMinusA(event.target.value)}>
          <option value="">{t('dash.exclusionsA')}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <select aria-label={t('dash.exclusionsB')} value={minusB} onChange={(event) => setMinusB(event.target.value)}>
          <option value="">{t('dash.exclusionsB')}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <button type="button" className="btn btn--secondary" disabled={drawn} onClick={() => void addManual()}>
          {t('dash.exclusionsAdd')}
        </button>
      </div>
      <ul className="list">
        {manual.length === 0 ? (
          <li>{t('dash.exclusionsNone')}</li>
        ) : (
          manual.map((item) => (
            <li key={`${item.memberA}-${item.memberB}`}>
              <span>{nameOf(item.memberA)} ↔ {nameOf(item.memberB)}</span>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={drawn}
                onClick={() =>
                  void mutate(
                    `/api/rooms/${code}/exclusions/${encodeURIComponent(item.memberA)}/${encodeURIComponent(item.memberB)}`,
                    undefined,
                    'DELETE',
                  )
                }
              >
                {t('dash.exclusionsRemove')}
              </button>
            </li>
          ))
        )}
      </ul>

      <ConfirmDialog
        opened={removeGroup !== null}
        title={t('v69.confirm.groupRemove')}
        triggerRef={removeTrigger}
        onCancel={() => setRemoveGroup(null)}
        onConfirm={() => {
          const group = removeGroup;
          setRemoveGroup(null);
          if (group) void mutate(`/api/rooms/${code}/groups/${encodeURIComponent(group)}`, undefined, 'DELETE', 'dash.groupsRemoved');
        }}
      >
        <p>{removeGroup}</p>
      </ConfirmDialog>
    </section>
  );
}
