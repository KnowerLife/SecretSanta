import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityView,
  AssignmentView,
  RoomView,
} from '@secret-santa/shared/contracts';
import { useI18n } from '../app/providers/i18n.tsx';
import { apiFetch, roomToken } from '../shared/api/client.ts';
import { ChatPanel } from '../features/chat/ChatPanel.tsx';
import { Scene } from '../shared/ui/Scene.tsx';
import type { RoomBootstrap } from '../entities/room/server.ts';

type Tab = 'overview' | 'people' | 'access' | 'activity' | 'chat';

const SSE_EVENTS = [
  'room.created',
  'room.member_joined',
  'room.wishlist_updated',
  'room.gift_status',
  'room.profile_updated',
  'room.exclusion_added',
  'room.exclusion_removed',
  'room.drawn',
  'room.draw_reset',
  'room.message',
];

interface SessionsResponse {
  sessions: Array<{ id: string; createdAt: string; expiresAt: string; revoked: boolean }>;
}

export function RoomDashboard({ code, bootstrap }: { code: string; bootstrap: RoomBootstrap }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [wish, setWish] = useState('');
  const [profile, setProfile] = useState({
    address: '',
    note: '',
    antiWishlist: '',
    size: '',
    links: '',
    allergies: '',
  });
  const [exclusionA, setExclusionA] = useState('');
  const [exclusionB, setExclusionB] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [sessions, setSessions] = useState<SessionsResponse['sessions']>([]);
  const [activity, setActivity] = useState<ActivityView[]>([]);

  const roomQuery = useQuery({
    queryKey: ['room', code],
    queryFn: () =>
      apiFetch<{ room: RoomView; me: RoomBootstrap['me'] }>(`/api/rooms/${code}`, { code }),
    initialData:
      bootstrap.ok && bootstrap.room
        ? { room: bootstrap.room, me: bootstrap.me }
        : undefined,
    enabled: bootstrap.ok,
  });

  const assignmentQuery = useQuery({
    queryKey: ['assignment', code],
    queryFn: () => apiFetch<AssignmentView>(`/api/rooms/${code}/assignment`, { code }),
    initialData: bootstrap.assignment,
    enabled: bootstrap.ok,
  });

  const room = roomQuery.data?.room;
  const me = roomQuery.data?.me;
  const organizer = me?.role === 'organizer';
  const assignment = assignmentQuery.data;
  const members = room?.members ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['room', code] }),
      queryClient.invalidateQueries({ queryKey: ['assignment', code] }),
      queryClient.invalidateQueries({ queryKey: ['messages', code] }),
    ]);
  };

  useEffect(() => {
    if (!bootstrap.ok) return;
    const token = roomToken(code);
    if (!token) return;
    const source = new EventSource(
      `/api/rooms/${code}/events?token=${encodeURIComponent(token)}`,
    );
    const reload = () => void refresh();
    for (const name of SSE_EVENTS) source.addEventListener(name, reload);
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, bootstrap.ok]);

  useEffect(() => {
    if (!bootstrap.ok || !organizer) return;
    if (tab === 'activity') {
      void apiFetch<{ activity: ActivityView[] }>(`/api/rooms/${code}/activity?limit=50`, {
        code,
      })
        .then((data) => setActivity(data.activity))
        .catch(() => undefined);
    }
    if (tab === 'access') {
      void apiFetch<SessionsResponse>(`/api/rooms/${code}/sessions`, { code })
        .then((data) => setSessions(data.sessions))
        .catch(() => undefined);
    }
  }, [tab, code, organizer, bootstrap.ok]);

  const mutate = async (
    path: string,
    body?: unknown,
    method = 'POST',
    messageKey?: string,
  ) => {
    setError('');
    try {
      await apiFetch(path, { method, body, code });
      if (messageKey) setNotice(t(messageKey));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('err.network'));
    }
  };

  if (!bootstrap.ok || !room) {
    return (
      <div className="container dashboard">
        <div className="empty-state">
          <Scene id="dashboard-empty" />
          <h1>{t('dash.emptyTitle')}</h1>
          <p>{bootstrap.error === 'unauthorized' ? t('dash.accessSub') : t('dash.emptySub')}</p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/join">
              {t('nav.join')}
            </a>
            <a className="btn btn--secondary" href="/">
              {t('nav.home')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const inviteLink = inviteToken
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/join?code=${code}&invite=${encodeURIComponent(inviteToken)}`
    : '';

  return (
    <div className="container dashboard">
      <div className="dashboard__head">
        <div>
          <span className="kicker">{t('dash.demoBadge')}</span>
          <h1>{room.name}</h1>
        </div>
        <span className="room-code">{room.code}</span>
        {me && <span className="pill">{me.name}</span>}
      </div>

      <div className="notice" data-kind="success">
        {t('dash.recipientTitle')}: {assignment?.drawn ? assignment.recipient?.name : t('dash.recipientNone')}
      </div>
      {notice && <div className="notice" data-kind="success">{notice}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="stat-grid">
        <div className="stat"><strong>{room.ready.members}</strong><span>{t('dash.statusPlayers')}</span></div>
        <div className="stat"><strong>{room.ready.wishlists}</strong><span>{t('dash.statusWishlists')}</span></div>
        <div className="stat"><strong>{room.ready.gifts}</strong><span>{t('dash.statusGifts')}</span></div>
        <div className="stat"><strong>{room.drawRunId ? '✓' : '—'}</strong><span>{t('dash.statusDraw')}</span></div>
      </div>

      <div className="tabs" role="tablist" aria-label={t('dash.tabsAria')}>
        {(
          [
            ['overview', 'dash.tabOverview'],
            ['people', 'dash.tabPeople'],
            ['access', 'dash.tabAccess'],
            ['activity', 'dash.activityTitle'],
            ['chat', 'dash.chatTitle'],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="tab"
            data-active={tab === id}
            key={id}
            onClick={() => setTab(id)}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid--2">
          <section className="panel">
            <h2>{t('dash.recipientTitle')}</h2>
            <p className="panel__sub">{t('dash.recipientSub')}</p>
            {assignment?.drawn && assignment.recipient ? (
              <>
                <h3>{assignment.recipient.name}</h3>
                <h4>{t('dash.recipientWishlist')}</h4>
                <ul className="list">
                  {assignment.recipient.wishlist.length === 0 ? (
                    <li>{t('dash.recipientWishlistEmpty')}</li>
                  ) : (
                    assignment.recipient.wishlist.map((item) => <li key={item}>{item}</li>)
                  )}
                </ul>
                <h4>{t('dash.recipientProfileTitle')}</h4>
                {Object.keys(assignment.recipient.profile).length === 0 ? (
                  <p className="panel__sub">{t('dash.recipientProfileEmpty')}</p>
                ) : (
                  <ul className="list">
                    {Object.entries(assignment.recipient.profile).map(([key, value]) => (
                      <li key={key}><strong>{key}:</strong> {value}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Scene id="recipient-waiting" />
                <p>{t('dash.recipientNone')}</p>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>{t('dash.myWishlistTitle')}</h2>
            <p className="panel__sub">{t('dash.myWishlistSub')}</p>
            <div className="field">
              <label htmlFor="wish-input" className="sr-only">{t('dash.myWishlistPh')}</label>
              <input
                id="wish-input"
                value={wish}
                onChange={(event) => setWish(event.target.value)}
                placeholder={t('dash.myWishlistPh')}
              />
            </div>
            <div className="btn-row">
              <button
                className="btn btn--primary"
                type="button"
                onClick={async () => {
                  if (!wish.trim()) return;
                  await mutate(`/api/rooms/${code}/wishlist`, { text: wish.trim() }, 'POST', 'toast.wishAdded');
                  setWish('');
                }}
              >
                {t('dash.myWishlistAdd')}
              </button>
            </div>
            <ul className="list">
              {members
                .find((member) => member.id === me?.id)
                ?.wishlist.map((item) => (
                  <li key={item.id}>
                    <span>{item.text}</span>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() =>
                        void mutate(`/api/rooms/${code}/wishlist/${item.id}`, undefined, 'DELETE')
                      }
                    >
                      {t('dash.wishDelete')}
                    </button>
                  </li>
                ))}
            </ul>

            <h2 style={{ marginTop: 24 }}>{t('dash.giftStatus')}</h2>
            <div className="btn-row">
              {(['none', 'idea', 'bought', 'done'] as const).map((status) => (
                <button
                  key={status}
                  className="tab"
                  data-active={me?.giftStatus === status}
                  type="button"
                  onClick={() =>
                    void mutate(`/api/rooms/${code}/gift-status`, { status }, 'POST', 'toast.statusSaved')
                  }
                >
                  {t(`dash.gift.${status}`)}
                </button>
              ))}
            </div>

            <h2 style={{ marginTop: 24 }}>{t('dash.myProfileTitle')}</h2>
            <p className="panel__sub">{t('dash.myProfileSub')}</p>
            {(
              [
                ['address', 'dash.profileAddressLabel', 'dash.profileAddressPh'],
                ['note', 'dash.profileNoteLabel', 'dash.profileNotePh'],
                ['antiWishlist', 'dash.profileAntiLabel', 'dash.profileAntiPh'],
                ['size', 'dash.profileSizeLabel', 'dash.profileSizePh'],
                ['links', 'dash.profileLinksLabel', 'dash.profileLinksPh'],
                ['allergies', 'dash.profileAllergiesLabel', 'dash.profileAllergiesPh'],
              ] as Array<[keyof typeof profile, string, string]>
            ).map(([field, label, placeholder]) => (
              <div className="field" key={field}>
                <label htmlFor={`profile-${field}`}>{t(label)}</label>
                <input
                  id={`profile-${field}`}
                  value={profile[field]}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, [field]: event.target.value }))
                  }
                  placeholder={t(placeholder)}
                />
              </div>
            ))}
            <button
              className="btn btn--primary"
              type="button"
              onClick={() =>
                void mutate(`/api/rooms/${code}/profile`, profile, 'POST', 'dash.profileSaved')
              }
            >
              {t('dash.profileSave')}
            </button>
            <p className="field-hint">{t('dash.profilePrivacy')}</p>
          </section>

          {organizer && (
            <section className="panel" style={{ gridColumn: '1 / -1' }}>
              <h2>{t('dash.checklistTitle')}</h2>
              <div className="btn-row">
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => void mutate(`/api/rooms/${code}/draw`, {}, 'POST', 'toast.drawDone')}
                >
                  {t('dash.draw')}
                </button>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() =>
                    void mutate(`/api/rooms/${code}/draw/reset`, {}, 'POST', 'toast.drawReset')
                  }
                >
                  {t('dash.reset')}
                </button>
              </div>
              <h3 style={{ marginTop: 20 }}>{t('dash.exclusionsTitle')}</h3>
              <p className="panel__sub">{t('dash.exclusionsSub')}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  aria-label={t('dash.exclusionsA')}
                  value={exclusionA}
                  onChange={(event) => setExclusionA(event.target.value)}
                >
                  <option value="">{t('dash.exclusionsA')}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <select
                  aria-label={t('dash.exclusionsB')}
                  value={exclusionB}
                  onChange={(event) => setExclusionB(event.target.value)}
                >
                  <option value="">{t('dash.exclusionsB')}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() =>
                    void mutate(`/api/rooms/${code}/exclusions`, {
                      memberA: exclusionA,
                      memberB: exclusionB,
                    }, 'POST', 'dash.exclusionsAdded')
                  }
                >
                  {t('dash.exclusionsAdd')}
                </button>
              </div>
              <ul className="list">
                {room.exclusions.length === 0 ? (
                  <li>{t('dash.exclusionsNone')}</li>
                ) : (
                  room.exclusions.map((item) => (
                    <li key={`${item.memberA}-${item.memberB}`}>
                      {members.find((member) => member.id === item.memberA)?.name} ↔{' '}
                      {members.find((member) => member.id === item.memberB)?.name}
                      <button
                        className="btn btn--secondary"
                        type="button"
                        onClick={() =>
                          void mutate(
                            `/api/rooms/${code}/exclusions/${item.memberA}/${item.memberB}`,
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
            </section>
          )}
        </div>
      )}

      {tab === 'people' && (
        <section className="panel">
          <h2>{t('dash.participantsTitle')}</h2>
          <p className="panel__sub">{t('dash.participantsSub')}</p>
          <ul className="list">
            {members.map((member) => (
              <li key={member.id}>
                <strong>{member.name}</strong>
                {member.role === 'organizer' && <span className="pill">{t('dash.participantOrganizer')}</span>}
                <span className="pill">{t(`dash.gift.${member.giftStatus}`)}</span>
                <span className="pill">{t('dash.participantWishes')}: {member.wishlist.length}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'access' && (
        <section className="panel">
          <h2>{t('dash.accessTitle')}</h2>
          <p className="panel__sub">{t('dash.accessSub')}</p>
          <div className="btn-row">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() =>
                void apiFetch<{ inviteToken: string }>(`/api/rooms/${code}/invites`, {
                  method: 'POST',
                  body: { role: 'participant', maxUses: 10 },
                  code,
                })
                  .then((data) => setInviteToken(data.inviteToken))
                  .catch(() => setError(t('err.network')))
              }
            >
              {t('dash.inviteBtn')}
            </button>
            {inviteLink && (
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                {t('dash.copyInvite')}
              </button>
            )}
          </div>
          {inviteLink && <p className="field-hint">{inviteLink}</p>}
          <h3 style={{ marginTop: 24 }}>{t('dash.refreshSessions')}</h3>
          {sessions.length === 0 ? (
            <p className="panel__sub">{t('dash.noSessions')}</p>
          ) : (
            <ul className="list">
              {sessions.map((session) => (
                <li key={session.id}>
                  <span>{session.id}</span>
                  <span className="pill">
                    {session.revoked ? t('dash.sessionRevoked') : t('dash.sessionCurrent')}
                  </span>
                  {!session.revoked && (
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() =>
                        void mutate(`/api/rooms/${code}/sessions/revoke`, { sessionId: session.id })
                      }
                    >
                      {t('dash.revokeSession')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'activity' && (
        <section className="panel">
          <h2>{t('dash.activityTitle')}</h2>
          <p className="panel__sub">{t('dash.activitySub')}</p>
          {!organizer ? (
            <p className="form-error">{t('dash.chatUnavailable')}</p>
          ) : activity.length === 0 ? (
            <div className="empty-state">
              <Scene id="activity-empty" />
              <p>{t('dash.activityEmpty')}</p>
            </div>
          ) : (
            <ul className="list">
              {activity.map((event) => (
                <li key={event.id}>
                  <strong>{event.type}</strong>
                  <span>{event.actor ?? '—'}</span>
                  <span className="pill">{new Date(event.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'chat' && (
        <section className="panel">
          <h2>{t('dash.chatTitle')}</h2>
          <p className="panel__sub">{t('dash.chatSub')}</p>
          <ChatPanel
            code={code}
            initialMessages={bootstrap.messages ?? []}
          />
        </section>
      )}
    </div>
  );
}
