import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { notifications } from '@mantine/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityView,
  AssignmentView,
  RoomView,
  SessionView,
} from '@secret-santa/shared/contracts';
import { useI18n } from '../app/providers/i18n.tsx';
import { apiFetch, getLocalRoomBootstrap, rememberRoom, roomToken } from '../shared/api/client.ts';
import { ChatPanel } from '../features/chat/ChatPanel.tsx';
import { PushControls } from '../features/local-play/PushControls.tsx';
import { Scene } from '../shared/ui/Scene.tsx';
import type { RoomBootstrap } from '../entities/room/server.ts';
import { ActivityLog } from '../features/dashboard/ActivityLog.tsx';
import { ConfirmDialog } from '../features/dashboard/ConfirmDialog.tsx';
import { GroupsManager } from '../features/dashboard/GroupsManager.tsx';
import { InvitePanel } from '../features/dashboard/InvitePanel.tsx';
import { MembersManager } from '../features/dashboard/MembersManager.tsx';
import { ProgressPanel } from '../features/dashboard/ProgressPanel.tsx';
import { AntiPresets, WishPresets } from '../features/dashboard/Presets.tsx';
import { RevealCard } from '../features/dashboard/RevealCard.tsx';
import { RoomGuide } from '../features/dashboard/RoomGuide.tsx';
import { SessionsPanel } from '../features/dashboard/SessionsPanel.tsx';
import type { Mutation, Tab } from '../features/dashboard/types.ts';

const SSE_EVENTS = [
  'room.created',
  'room.member_joined',
  'room.member_added',
  'room.member_removed',
  'room.wishlist_updated',
  'room.gift_status',
  'room.profile_updated',
  'profile.note',
  'room.exclusion_added',
  'room.exclusion_removed',
  'room.group_added',
  'room.group_removed',
  'room.drawn',
  'room.draw_reset',
  'room.message',
];

type ProfileForm = Record<'address' | 'note' | 'antiWishlist' | 'size' | 'links' | 'allergies', string>;

const PROFILE_FIELDS = [
  ['address', 'dash.profileAddressLabel', 'dash.profileAddressPh'],
  ['note', 'dash.profileNoteLabel', 'dash.profileNotePh'],
  ['antiWishlist', 'dash.profileAntiLabel', 'dash.profileAntiPh'],
  ['size', 'dash.profileSizeLabel', 'dash.profileSizePh'],
  ['links', 'dash.profileLinksLabel', 'dash.profileLinksPh'],
  ['allergies', 'dash.profileAllergiesLabel', 'dash.profileAllergiesPh'],
] as const satisfies ReadonlyArray<[keyof ProfileForm, string, string]>;

const GUIDE_STEPS = 5;

function storedFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === '1';
}

function storedStep(key: string): number {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(key));
  return Number.isInteger(value) && value >= 0 && value < GUIDE_STEPS ? value : 0;
}

export function RoomDashboard({ code, bootstrap }: { code: string; bootstrap: RoomBootstrap }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [wish, setWish] = useState('');
  const [profile, setProfile] = useState<ProfileForm>({
    address: '',
    note: '',
    antiWishlist: '',
    size: '',
    links: '',
    allergies: '',
  });
  // Старт одинаковый на сервере и клиенте; фактическое состояние сети читаем в эффекте.
  const [online, setOnline] = useState(true);
  const [demoBusy, setDemoBusy] = useState(false);
  const resetTrigger = useRef<HTMLButtonElement>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const guideKey = `ss:v69:guide:${code.toUpperCase()}`;
  const revealKey = `ss:v69:revealed:${code.toUpperCase()}`;
  const [guideStep, setGuideStepState] = useState(() => storedStep(guideKey));
  const [revealed, setRevealedState] = useState(() => storedFlag(revealKey));
  const lastRun = useRef<string | null>(null);

  // Локальная комната не имеет серверной сессии: её данные доступны только в этом браузере.
  const [localBootstrap] = useState(() => (bootstrap.ok ? null : getLocalRoomBootstrap(code)));
  const hasBootstrap = bootstrap.ok || Boolean(localBootstrap);

  const roomQuery = useQuery({
    queryKey: ['room', code],
    queryFn: () =>
      apiFetch<{ room: RoomView; me: RoomBootstrap['me'] }>(`/api/rooms/${code}`, { code }),
    initialData:
      bootstrap.ok && bootstrap.room
        ? { room: bootstrap.room, me: bootstrap.me }
        : localBootstrap
          ? { room: localBootstrap.room, me: localBootstrap.me }
          : undefined,
    enabled: hasBootstrap,
  });

  const assignmentQuery = useQuery({
    queryKey: ['assignment', code],
    queryFn: () => apiFetch<AssignmentView>(`/api/rooms/${code}/assignment`, { code }),
    initialData: bootstrap.assignment ?? localBootstrap?.assignment,
    enabled: hasBootstrap,
  });

  const room = roomQuery.data?.room;
  const me = roomQuery.data?.me;
  const organizer = me?.role === 'organizer';
  const assignment = assignmentQuery.data;
  const drawn = Boolean(assignment?.drawn || room?.drawRunId);
  const myMember = room?.members.find((member) => member.id === me?.id);
  const myWishes = myMember?.wishlist.map((item) => item.text) ?? [];

  const sessionsQuery = useQuery({
    queryKey: ['sessions', code],
    queryFn: () =>
      apiFetch<{ sessions: SessionView[] }>(`/api/rooms/${code}/sessions`, { code }),
    enabled: bootstrap.ok && organizer && tab === 'access',
  });

  const activityQuery = useQuery({
    queryKey: ['activity', code],
    queryFn: () =>
      apiFetch<{ activity: ActivityView[] }>(`/api/rooms/${code}/activity?limit=50`, { code }),
    enabled: bootstrap.ok && organizer && tab === 'activity',
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['room', code] }),
      queryClient.invalidateQueries({ queryKey: ['assignment', code] }),
      queryClient.invalidateQueries({ queryKey: ['messages', code] }),
      queryClient.invalidateQueries({ queryKey: ['sessions', code] }),
      queryClient.invalidateQueries({ queryKey: ['activity', code] }),
    ]);
  }, [code, queryClient]);

  const mutate = useCallback<Mutation>(
    async (path, body, method = 'POST', messageKey) => {
      try {
        await apiFetch(path, { method, body, code });
        if (messageKey) {
          notifications.show({ message: t(messageKey), color: 'green', autoClose: 3500 });
        }
        await refresh();
        return true;
      } catch {
        notifications.show({
          message: t(
            path.includes('/draw') && !path.includes('/draw/reset')
              ? 'toast.drawFail'
              : 'err.network',
          ),
          color: 'red',
          autoClose: 5000,
        });
        return false;
      }
    },
    [code, refresh, t],
  );

  const goTab = (next: Tab, focusId?: string) => {
    setTab(next);
    if (focusId) window.setTimeout(() => document.getElementById(focusId)?.focus(), 0);
  };

  const setGuideStep = (step: number) => {
    setGuideStepState(step);
    if (typeof window !== 'undefined') window.localStorage.setItem(guideKey, String(step));
  };

  const reveal = () => {
    setRevealedState(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(revealKey, '1');
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
  }, [code, bootstrap.ok, refresh]);

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' || navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!myMember) return;
    setProfile({
      address: myMember.profile.address ?? '',
      note: myMember.profile.note ?? '',
      antiWishlist: myMember.profile.antiWishlist ?? '',
      size: myMember.profile.size ?? '',
      links: myMember.profile.links ?? '',
      allergies: myMember.profile.allergies ?? '',
    });
    // Профиль подтягиваем один раз при смене участника, не затирая ввод по SSE.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMember?.id]);

  useEffect(() => {
    const run = room?.drawRunId ?? null;
    if (run !== lastRun.current) {
      lastRun.current = run;
      setRevealedState(false);
      if (typeof window !== 'undefined') window.localStorage.removeItem(revealKey);
    }
  }, [room?.drawRunId, revealKey]);

  const addWish = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ok = await mutate(`/api/rooms/${code}/wishlist`, { text: trimmed }, 'POST', 'toast.wishAdded');
    if (ok) setWish('');
  };

  const setAnti = async (text: string) => {
    if (profile.antiWishlist.includes(text)) return;
    const previous = profile;
    const value = [profile.antiWishlist, text].filter(Boolean).join(', ');
    const next = { ...profile, antiWishlist: value };
    setProfile(next);
    const ok = await mutate(`/api/rooms/${code}/profile`, next, 'POST', 'dash.profileSaved');
    if (!ok) setProfile(previous);
  };

  const recreateDemo = async () => {
    setDemoBusy(true);
    try {
      const result = await apiFetch<{ code: string; token: string; memberToken: string }>(
        '/api/rooms/demo',
        { method: 'POST', body: {} },
      );
      rememberRoom(result.code, result.token, result.memberToken);
      await navigate({ to: '/room/$code', params: { code: result.code } });
    } catch {
      notifications.show({
        message: t('err.network'),
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setDemoBusy(false);
    }
  };

  if (!hasBootstrap || !room) {
    return (
      <div className="container dashboard">
        <div className="empty-state">
          <Scene id="dashboard-empty" />
          <h1>{t('dash.emptyTitle')}</h1>
          <p>{bootstrap.error === 'unauthorized' ? t('dash.accessSub') : t('dash.emptySub')}</p>
          <div className="btn-row">
            <a className="btn btn--primary" href="/join">{t('dash.emptyJoin')}</a>
            <a className="btn btn--secondary" href="/create">{t('dash.emptyCreate')}</a>
            <a className="btn btn--secondary" href="/">{t('nav.home')}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container dashboard">
      <div className="dashboard__head">
        <div>
          <span className="kicker">{t('dash.emptyKicker')}</span>
          <h1>{room.name}</h1>
        </div>
        <span className="room-code" aria-label={t('dash.roomCode')} title={t('dash.roomCode')}>
          {room.code}
        </span>
        {me && <span className="pill">{me.name}</span>}
        {room.demo && (
          <>
            <span className="pill" data-demo="true">{t('dash.demoBadge')}</span>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={demoBusy}
              onClick={() => void recreateDemo()}
            >
              {t('dash.resetDemo')}
            </button>
          </>
        )}
      </div>

      <div className="dashboard__stack">
        <ProgressPanel room={room} me={myMember} drawn={drawn} online={online} />
        <RoomGuide
          room={room}
          me={myMember}
          drawn={drawn}
          step={guideStep}
          onStepChange={setGuideStep}
          onGo={goTab}
          onReveal={reveal}
        />
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
        <div className="dashboard__stack">
          <div className="grid dash-overview">
            <RevealCard
              recipient={assignment?.recipient ?? null}
              drawn={drawn}
              revealed={revealed}
              onReveal={reveal}
            />

            <div className="dashboard__stack">
              <section className="panel" aria-labelledby="wishlist-title">
                <h2 id="wishlist-title">{t('dash.myWishlistTitle')}</h2>
                <p className="panel__sub">{t('dash.myWishlistSub')}</p>
                <div className="field">
                  <label htmlFor="wish-input" className="sr-only">{t('dash.myWishlistPh')}</label>
                  <input
                    id="wish-input"
                    aria-label={t('wish.label')}
                    value={wish}
                    onChange={(event) => setWish(event.target.value)}
                    placeholder={t('dash.myWishlistPh')}
                  />
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void addWish(wish)}
                  >
                    {t('dash.myWishlistAdd')}
                  </button>
                </div>
                {myMember?.wishlist.length === 0 && <p className="panel__sub">{t('dash.myWishlistEmpty')}</p>}
                <ul className="list">
                  {myMember?.wishlist.map((item) => (
                    <li key={item.id}>
                      <span>{item.text}</span>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() =>
                          void mutate(`/api/rooms/${code}/wishlist/${item.id}`, undefined, 'DELETE')
                        }
                      >
                        {t('dash.wishDelete')}
                      </button>
                    </li>
                  ))}
                </ul>
                <WishPresets wishes={myWishes} onAdd={(text) => void addWish(text)} />
              </section>

              <section className="panel" aria-labelledby="profile-title">
                <h2 id="profile-title">{t('dash.myProfileTitle')}</h2>
                <p className="panel__sub">{t('dash.myProfileSub')}</p>
                {PROFILE_FIELDS.map(([field, label, placeholder]) => (
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
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() =>
                      void mutate(`/api/rooms/${code}/profile`, profile, 'POST', 'dash.profileSaved')
                    }
                  >
                    {t('dash.profileSave')}
                  </button>
                </div>
                <p className="field-hint">{t('dash.profilePrivacy')}</p>
                <AntiPresets value={profile.antiWishlist} onSet={(text) => void setAnti(text)} />
              </section>

              <section className="panel" aria-labelledby="gift-status-title">
                <h2 id="gift-status-title">{t('dash.giftStatus')}</h2>
                <div className="btn-row">
                  {(['none', 'idea', 'bought', 'done'] as const).map((status) => (
                    <button
                      key={status}
                      id={`gift-status-${status}`}
                      type="button"
                      className="tab"
                      data-active={me?.giftStatus === status}
                      onClick={() =>
                        void mutate(`/api/rooms/${code}/gift-status`, { status }, 'POST', 'toast.statusSaved')
                      }
                    >
                      {t(`dash.gift.${status}`)}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {organizer && (
            <section className="panel panel--wide" aria-labelledby="draw-title">
              <h2 id="draw-title">{t('dash.checklistTitle')}</h2>
              <p className="panel__sub">{t('dash.statusSub')}</p>
              <div className="btn-row">
                <button
                  id="draw-btn"
                  type="button"
                  className="btn btn--primary"
                  disabled={drawn}
                  onClick={() => {
                    if (room.members.length < 3) {
                      notifications.show({
                        message: t('toast.drawNeed3'),
                        color: 'yellow',
                        autoClose: 4000,
                      });
                      return;
                    }
                    void mutate(`/api/rooms/${code}/draw`, {}, 'POST', 'toast.drawDone');
                  }}
                >
                  {t(drawn ? 'dash.drawDone' : 'dash.draw')}
                </button>
                {drawn && (
                  <button
                    ref={resetTrigger}
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setResetOpen(true)}
                  >
                    {t('dash.reset')}
                  </button>
                )}
              </div>
              <ConfirmDialog
                opened={resetOpen}
                title={t('confirm.title')}
                triggerRef={resetTrigger}
                onCancel={() => setResetOpen(false)}
                onConfirm={() => {
                  setResetOpen(false);
                  setRevealedState(false);
                  if (typeof window !== 'undefined') window.localStorage.removeItem(revealKey);
                  void mutate(`/api/rooms/${code}/draw/reset`, {}, 'POST', 'toast.drawReset');
                }}
              >
                <p>{t('confirm.reset')}</p>
              </ConfirmDialog>
            </section>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="dashboard__stack">
          <MembersManager
            code={code}
            room={room}
            me={myMember}
            canManage={Boolean(organizer)}
            mutate={mutate}
          />
          {organizer && (
            <GroupsManager
              code={code}
              room={room}
              members={room.members}
              drawn={drawn}
              mutate={mutate}
            />
          )}
        </div>
      )}

      {tab === 'access' && (
        <div className="dashboard__stack">
          <PushControls code={code} memberId={me?.id} />
          {organizer ? (
            <>
              <InvitePanel code={code} room={room} />
              <SessionsPanel
                sessions={sessionsQuery.data?.sessions ?? []}
                onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['sessions', code] })}
                onRevoke={(id) =>
                  void mutate(
                    `/api/rooms/${code}/sessions/revoke`,
                    { sessionId: id },
                    'POST',
                    'dash.sessionRevokedOk',
                  )
                }
              />
            </>
          ) : (
            <section className="panel">
              <p className="panel__sub">{t('dash.accessSub')}</p>
            </section>
          )}
        </div>
      )}

      {tab === 'activity' && (
        organizer ? (
          <ActivityLog room={room} events={activityQuery.data?.activity ?? []} />
        ) : (
          <section className="panel">
            <p className="panel__sub">{t('dash.activitySub')}</p>
          </section>
        )
      )}

      {tab === 'chat' && (
        <section className="panel">
          <h2>{t('dash.chatTitle')}</h2>
          <p className="panel__sub">{t('dash.chatSub')}</p>
          <ChatPanel
            code={code}
            initialMessages={bootstrap.messages ?? localBootstrap?.messages ?? []}
            enabled={drawn}
          />
        </section>
      )}
    </div>
  );
}
