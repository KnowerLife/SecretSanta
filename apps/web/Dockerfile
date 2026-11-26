# Сборка из корня монорепозитория:
#   docker build -f apps/web/Dockerfile -t secret-santa-web:v69.1.1 \
#     --build-arg SECRET_SANTA_API_TARGET=http://api:8787 .
FROM node:22.22.3-bookworm-slim AS build
WORKDIR /app

# Vite читает адрес API и на этапе сборки (vite.config.ts), и в SSR-коде.
ARG SECRET_SANTA_API_TARGET=http://api:8787
ENV SECRET_SANTA_API_TARGET=${SECRET_SANTA_API_TARGET}

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/art/package.json packages/art/
RUN npm ci

COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY packages/art/package.json packages/art/
COPY packages/art/tsconfig.json packages/art/
COPY packages/art/src packages/art/src
COPY apps/web/package.json apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/vite.config.ts apps/web/
COPY apps/web/postcss.config.mjs apps/web/
COPY apps/web/src apps/web/src
COPY apps/web/public apps/web/public

RUN npm run build --workspace @secret-santa/web

FROM node:22.22.3-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    SECRET_SANTA_API_TARGET=http://api:8787

# vite preview загружает vite.config.ts, поэтому node_modules и исходники нужны и в образе рантайма.
COPY --from=build /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages ./packages

RUN chown -R node:node /app
USER node
EXPOSE 3000

CMD ["npm", "run", "preview", "--workspace", "@secret-santa/web", "--", "--host", "0.0.0.0"]
