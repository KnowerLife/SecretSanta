import { createPrivateKey, createSign, randomUUID } from 'node:crypto';
import { all, run } from './db.ts';

interface PushSubscription {
  endpoint: string;
  room_id: string | null;
  member_id: string | null;
  payload_json: string;
}

export interface PushResult {
  delivered: number;
  failures: number;
  removed: string[];
  disabled?: boolean;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function derToRaw(signature: Buffer): Buffer {
  if (signature[0] !== 0x30) return signature;
  let offset = 2;
  if (signature[1]! & 0x80) offset += signature[1]! & 0x7f;
  const readInt = (): Buffer => {
    if (signature[offset] !== 0x02) throw new Error('invalid DER signature');
    const length = signature[offset + 1]!;
    let value = signature.subarray(offset + 2, offset + 2 + length);
    while (value.length > 32 && value[0] === 0) value = value.subarray(1);
    offset += 2 + length;
    return Buffer.concat([Buffer.alloc(32 - value.length), value]);
  };
  return Buffer.concat([readInt(), readInt()]);
}

function privateKey() {
  const raw = process.env.VAPID_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const normalized = raw.includes('BEGIN') ? raw : Buffer.from(raw, 'base64url').toString('utf8');
    return createPrivateKey(normalized);
  } catch {
    return null;
  }
}

function vapidAuthorization(endpoint: string): string | null {
  const key = privateKey();
  if (!key) return null;
  let audience: string;
  try {
    audience = new URL(endpoint).origin;
  } catch {
    return null;
  }
  const header = base64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const body = base64url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    }),
  );
  const signer = createSign('SHA256');
  signer.update(`${header}.${body}`);
  const signature = derToRaw(signer.sign(key));
  return `WebPush ${header}.${body}.${base64url(signature)}`;
}

export function pushEnabled(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && privateKey());
}

/** Отправляет нейтральное уведомление без персонального payload. */
export async function sendRoomPush(roomId: string): Promise<PushResult> {
  if (!pushEnabled()) return { delivered: 0, failures: 0, removed: [], disabled: true };
  const subscriptions = all<PushSubscription>(
    'SELECT endpoint, room_id, member_id, payload_json FROM push_subscriptions WHERE room_id = ?',
    roomId,
  );
  const result: PushResult = { delivered: 0, failures: 0, removed: [] };

  for (const subscription of subscriptions) {
    const authorization = vapidAuthorization(subscription.endpoint);
    if (!authorization) {
      result.failures += 1;
      continue;
    }
    try {
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/octet-stream',
          TTL: '60',
          Topic: `secret-santa-${randomUUID()}`,
          Urgency: 'normal',
        },
        body: '',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok || response.status === 201 || response.status === 202) {
        result.delivered += 1;
      } else if (response.status === 404 || response.status === 410) {
        run('DELETE FROM push_subscriptions WHERE endpoint = ?', subscription.endpoint);
        result.removed.push(subscription.endpoint);
      } else {
        result.failures += 1;
      }
    } catch {
      result.failures += 1;
    }
  }
  return result;
}
