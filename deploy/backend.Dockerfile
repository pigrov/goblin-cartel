FROM node:22-alpine

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

RUN pnpm --filter @goblin-cartel/content-schemas build
RUN pnpm --filter @goblin-cartel/backend build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @goblin-cartel/backend db:migrate && node apps/backend/dist/index.js"]
