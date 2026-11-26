import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import type { MessageView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { apiFetch, roomToken } from '../../shared/api/client.ts';
import { flushQueue, queueMessage, readQueue } from '../../shared/pwa/offlineQueue.ts';
import { Scene } from '../../shared/ui/Scene.tsx';
import { formatTime } from '../dashboard/format.ts';

type Channel = MessageView['channel'];

const TEMPLATES = ['dash.tplSize', 'dash.tplAddress', 'dash.tplAllergy', 'dash.tplThanks'] as const;

interface PendingMessage {
  key: string;
  channel: Channel;
  text: string;
  createdAt: string;
}

export function ChatPanel({
  code,
  initialMessages,
  enabled,
}: {
  code: string;
  initialMessages: MessageView[];
  enabled: boolean;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<Channel, string>>({
    to_recipient: '',
    to_santa: '',
  });
  const [pending, setPending] = useState<PendingMessage[]>([]);

  const messagesQuery = useQuery({
    queryKey: ['messages', code],
    queryFn: () =>
      apiFetch<{ messages: MessageView[] }>(`/api/rooms/${code}/messages`, { code }),
    initialData: { messages: initialMessages },
  });
  const messages = messagesQuery.data.messages;

  useEffect(() => {
    const flush = () => {
      void flushQueue((request) =>
        apiFetch(request.path, {
          method: 'POST',
          body: request.body,
          token: request.token,
        }).then(() => undefined),
      ).then(({ sent }) => {
        if (sent > 0) {
          const remaining = new Set(readQueue().map((request) => request.id));
          setPending((current) => current.filter((item) => remaining.has(item.key)));
          notifications.show({ message: t('toast.queueSent'), color: 'green', autoClose: 3500 });
          void queryClient.invalidateQueries({ queryKey: ['messages', code] });
        }
      });
    };
    window.addEventListener('online', flush);
    if (typeof navigator !== 'undefined' && navigator.onLine) flush();
    return () => window.removeEventListener('online', flush);
  }, [code, queryClient, t]);

  const send = async (channel: Channel) => {
    if (!enabled) return;
    const text = draft[channel].trim();
    if (!text) return;
    const path = `/api/rooms/${code}/messages`;
    const body = { channel, text };
    const token = roomToken(code);
    const optimistic: PendingMessage = {
      key: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      channel,
      text,
      createdAt: new Date().toISOString(),
    };
    setPending((current) => [...current, optimistic]);
    setDraft((current) => ({ ...current, [channel]: '' }));

    const queue = () => {
      const queued = queueMessage(path, body, token);
      setPending((current) =>
        current.map((item) => (item.key === optimistic.key ? { ...item, key: queued.id } : item)),
      );
      notifications.show({ message: t('toast.queuedOffline'), color: 'yellow', autoClose: 4000 });
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queue();
      return;
    }

    try {
      await apiFetch(path, { method: 'POST', body, code });
      setPending((current) => current.filter((item) => item.key !== optimistic.key));
      await queryClient.invalidateQueries({ queryKey: ['messages', code] });
    } catch {
      queue();
    }
  };

  const channels: Array<{ id: Channel; label: string }> = [
    { id: 'to_recipient', label: t('dash.chatToRecipient') },
    { id: 'to_santa', label: t('dash.chatToSanta') },
  ];

  return (
    <div className="chat-panel">
      {!enabled && (
      <p className="notice" title={t('dash.chatUnavailable')}>
        {t('dash.chatNoDraw')}
      </p>
    )}
      {messages.length === 0 && pending.length === 0 && (
        <div className="empty-state">
          <Scene id="chat-empty" />
          <p>{t('dash.chatEmpty')}</p>
        </div>
      )}
      <div className="chat">
        {channels.map((channel) => {
          const visible = messages.filter((message) => message.channel === channel.id);
          const waiting = pending.filter((message) => message.channel === channel.id);
          return (
            <section className="chat__channel" key={channel.id}>
              <h3>{channel.label}</h3>
              <div className="chat__messages" aria-live="polite">
                {visible.length === 0 && waiting.length === 0 && (
                  <p className="panel__sub">{t('dash.chatEmpty')}</p>
                )}
                {visible.map((message) => (
                  <div className="chat__bubble" data-mine={message.fromMe} key={message.id}>
                    <span>{message.text}</span>
                    <span className="chat__meta">
                      {t(message.fromMe ? 'dash.chatYou' : 'dash.chatThem')} ·{' '}
                      {formatTime(message.createdAt, locale)}
                    </span>
                  </div>
                ))}
                {waiting.map((message) => (
                  <div className="chat__bubble chat__bubble--pending" data-mine key={message.key}>
                    <span>{message.text}</span>
                    <span className="chat__meta">{t('dash.chatPending')}</span>
                  </div>
                ))}
              </div>
              <div className="chat__templates" role="group" aria-label={t('dash.chatTitle')}>
                {TEMPLATES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="preset-chip"
                    disabled={!enabled}
                    onClick={() =>
                      setDraft((current) => ({ ...current, [channel.id]: t(key) }))
                    }
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <div className="chat__composer">
                <input
                  id={`chat-${channel.id}`}
                  aria-label={channel.label}
                  disabled={!enabled}
                  value={draft[channel.id]}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [channel.id]: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void send(channel.id);
                  }}
                  placeholder={t('dash.chatPlaceholder')}
                />
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!enabled}
                  onClick={() => void send(channel.id)}
                >
                  {t('dash.chatSend')}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
