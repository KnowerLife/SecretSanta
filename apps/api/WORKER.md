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
