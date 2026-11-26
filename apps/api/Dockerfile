# Сборка из корня монорепозитория:
#   docker build -f apps/api/Dockerfile -t secret-santa-api:v69.1.0 .
FROM node:22.22.3-bookworm-slim AS deps
WORKDIR /app

# Manifest'ы всех workspaces нужны npm ci, чтобы восстановить ссылки на пакеты
# из корневого package-lock.json. Исходники и локальная БД на этом шаге не копируются.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/art/package.json packages/art/
RUN npm ci --omit=dev

FROM node:22.22.3-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    SECRET_SANTA_V69_DB_PATH=/app/apps/api/data/app.db

COPY --from=deps /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/package.json /app/apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY apps/api/migrations ./apps/api/migrations

# Каталог БД монтируется именованным томом из compose; права нужны не-root процессу.
RUN mkdir -p /app/apps/api/data \
    && chown -R node:node /app/apps/api/data \
    && chmod 0777 /app/apps/api/data

USER node
# Рабочая директория API — пакет, но node_modules ищется выше, в корне /app.
WORKDIR /app/apps/api
EXPOSE 8787

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8787) + '/api/health').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "src/index.ts"]
