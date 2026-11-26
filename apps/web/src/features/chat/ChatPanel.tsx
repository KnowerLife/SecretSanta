import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { apiFetch, roomToken } from '../../shared/api/client.ts';
import { flushQueue, queueMessage } from '../../shared/pwa/offlineQueue.ts';
import { Scene } from '../../shared/ui/Scene.tsx';

type Channel = MessageView['channel'];

export function ChatPanel({
  code,
  initialMessages,
}: {
  code: string;
  initialMessages: MessageView[];
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<Channel, string>>({
    to_recipient: '',
    to_santa: '',
  });
  const [notice, setNotice] = useState('');

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
          setNotice(t('toast.queueSent'));
          void queryClient.invalidateQueries({ queryKey: ['messages', code] });
        }
      });
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [code, queryClient, t]);

  const send = async (channel: Channel) => {
    const text = draft[channel].trim();
    if (!text) return;
    const path = `/api/rooms/${code}/messages`;
    const body = { channel, text };
    const token = roomToken(code);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueMessage(path, body, token);
      setNotice(t('toast.queuedOffline'));
      setDraft((current) => ({ ...current, [channel]: '' }));
      return;
    }

    try {
      await apiFetch(path, { method: 'POST', body, code });
      setDraft((current) => ({ ...current, [channel]: '' }));
      await queryClient.invalidateQueries({ queryKey: ['messages', code] });
    } catch {
      queueMessage(path, body, token);
      setNotice(t('toast.queuedOffline'));
    }
  };

  const channels: Array<{ id: Channel; label: string }> = [
    { id: 'to_recipient', label: t('dash.chatToRecipient') },
    { id: 'to_santa', label: t('dash.chatToSanta') },
  ];

  return (
    <div>
      {notice && <p className="notice" data-kind="success">{notice}</p>}
      {messages.length === 0 && (
        <div className="empty-state">
          <Scene id="chat-empty" />
          <p>{t('dash.chatEmpty')}</p>
        </div>
      )}
      <div className="chat">
        {channels.map((channel) => {
          const visible = messages.filter((message) => message.channel === channel.id);
          return (
            <section className="chat__channel" key={channel.id}>
              <h3>{channel.label}</h3>
              <div className="chat__messages" aria-live="polite">
                {visible.length === 0 ? (
                  <p className="panel__sub">{t('dash.chatEmpty')}</p>
                ) : (
                  visible.map((message) => (
                    <div className="chat__bubble" data-mine={message.fromMe} key={message.id}>
                      {message.text}
                    </div>
                  ))
                )}
              </div>
              <div className="chat__composer">
                <input
                  aria-label={channel.label}
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
                  className="btn btn--primary"
                  type="button"
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
