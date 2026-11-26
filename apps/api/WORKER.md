# Воркер напоминаний v69

Воркер — отдельный процесс того же образа, что и API. В compose он описан сервисом `worker` и запускается командой:

```bash
npm run worker --workspace @secret-santa/api
```

Скрипт `worker` должен быть объявлен в `apps/api/package.json`; точка входа — `apps/api/src/worker.ts`. До запуска воркера compose ждёт, пока API станет здоровым (`depends_on: api: condition: service_healthy`), поэтому миграции из `apps/api/migrations` уже применены.

Воркер читает задачи из таблицы `notification_jobs` (`id`, `room_id`, `channel`, `kind`, `payload_json`, `scheduled_at`, `status`) в той же базе, что и API: `SECRET_SANTA_V69_DB_PATH`. Каталог БД смонтирован общим именованным томом `v69_api_data`, поэтому API, web и воркер видят одни и те же данные. Политика `restart: unless-stopped` перезапускает процесс после сбоя; при временной недоступности доставки воркер должен логировать ошибку и продолжать обработку следующих задач, не роняя контейнер.

## Запуск

```bash
cp .env.example .env
docker compose -f docker-compose.v69.yml up -d --build
```

Только воркер:

```bash
docker compose -f docker-compose.v69.yml up -d worker
```

## VAPID-ключи и ротация

Воркер и API должны использовать одну и ту же пару P-256 (ES256): приватный ключ живёт только в окружении, публичный ключ доступен клиентам через `/api/push/config` в формате base64url от 65 байт `0x04 || x || y`.

```bash
# Временный файл с приватным ключом: не коммитить и не логировать
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -outform PEM > vapid-private.pem

# Публичный ключ для VAPID_PUBLIC_KEY
node -e "const fs=require('node:fs'); const {createPublicKey}=require('node:crypto'); const {x,y}=createPublicKey(fs.readFileSync('vapid-private.pem')).export({format:'jwk'}); const raw=Buffer.concat([Buffer.from([4]),Buffer.from(x,'base64url'),Buffer.from(y,'base64url')]); process.stdout.write(raw.toString('base64url')+'\n')"
```

Запишите `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` и `VAPID_SUBJECT` в `.env` или секрет-менеджер, после чего удалите `vapid-private.pem`. `VAPID_PRIVATE_KEY` принимает PEM целиком или тот же PEM в base64url. Приватный ключ не должен попадать ни в логи, ни в ответы API: в логах достаточно факта наличия ключа.

Ротация:

1. Сгенерируйте новую пару и задайте оба ключа для API и воркера; `VAPID_SUBJECT` меняйте только если изменился контакт.
2. Перезапустите оба процесса, чтобы они подхватили новые значения:
   ```bash
   docker compose -f docker-compose.v69.yml up -d --force-recreate api worker
   ```
3. Проверьте `/api/push/config`: `enabled=true` и новый `publicKey`; убедитесь, что приватный ключ не логируется.
4. Старые подписки, созданные с прежним публичным ключом, после ротации могут получать отказы провайдера. Недействительные записи должны удаляться из `push_subscriptions`, а клиенты — заново подписываться с новым `publicKey`. До внедрения обработки таких ответов проверяйте логи воркера и при необходимости инициируйте переподписку вручную.

## Мониторинг

Логи процесса:

```bash
docker compose -f docker-compose.v69.yml logs -f worker
```

Очередь задач (статусы и количество) можно посмотреть через API-контейнер:

```bash
docker compose -f docker-compose.v69.yml exec api \
  node -e "const { DatabaseSync } = require('node:sqlite'); \
const db = new DatabaseSync(process.env.SECRET_SANTA_V69_DB_PATH, { readOnly: true }); \
console.log(db.prepare('SELECT status, COUNT(*) AS jobs FROM notification_jobs GROUP BY status').all())"
```

Нормальная работа: задачи из `notification_jobs` переходят из `queued` в обработанное состояние, строки с истёкшими/недействительными подписями удаляются, а в логах нет повторяющихся ошибок отправки. Если очередь растёт, проверьте `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` и доступность воркера.
