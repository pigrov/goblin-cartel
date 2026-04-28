FROM node:22-alpine AS builder

ARG APP_NAME
ARG APP_DIR

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/game-client/package.json apps/game-client/package.json
COPY packages/content-schemas/package.json packages/content-schemas/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/ui-kit/package.json packages/ui-kit/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @goblin-cartel/ui-kit build
RUN pnpm --filter @goblin-cartel/game-core build
RUN pnpm --filter ${APP_NAME} build

FROM nginx:alpine

ARG APP_DIR

COPY deploy/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/${APP_DIR}/dist /usr/share/nginx/html
