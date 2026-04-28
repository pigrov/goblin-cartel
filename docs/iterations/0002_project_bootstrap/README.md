# 0002 project bootstrap

**Дата старта:** 2026-04-28
**Статус:** первый ручной серверный деплой выполнен

## Цель

Развернуть стартовый monorepo в `D:\vscode\goblin-cartel`, подготовить основу CI/CD и серверного запуска для домена `goblin-cartel.murph.ru` и сервера `94.26.248.8`.

## Входной контекст

- Домен: `goblin-cartel.murph.ru`.
- Сервер: `94.26.248.8`.
- SSH alias: `selectel-transcribe`.
- GitHub remote: `git@github.com:pigrov/goblin-cartel.git`.
- `APP_CREDENTIALS_MASTER_KEY` и `APP_BOOTSTRAP_ADMIN_EMAILS` берутся из локального `.env`.
- Backend: Fastify.
- DB: PostgreSQL + Drizzle ORM + drizzle-kit.
- Деплой: Docker Compose.

## Решения

1. Использовать `pnpm` workspaces.
2. Создать приложения `apps/game-client`, `apps/admin`, `apps/backend`.
3. Создать пакеты `packages/game-core`, `packages/content-schemas`, `packages/ui-kit`.
4. Общие UI tokens хранить в `packages/ui-kit`.
5. CI должен запускать lint, typecheck, unit tests, UTF-8 check, build и Drizzle checks.
6. Deploy path выбран `/srv/goblin-cartel`, чтобы соответствовать принятому на сервере расположению проектов; каталог готовится root/sudo один раз, дальше deploy выполняется пользователем `deploy`.

## Сделано

- Инициализирован `pnpm` monorepo.
- Созданы приложения `apps/game-client`, `apps/admin`, `apps/backend`.
- Созданы пакеты `packages/game-core`, `packages/content-schemas`, `packages/ui-kit`.
- Добавлен Fastify backend с `/health` и bootstrap status endpoint.
- Добавлена Drizzle schema и первая миграция.
- Добавлено шифрование credentials через AES-256-GCM.
- Добавлены helpers для bootstrap admin emails и password hashing.
- Добавлены unit tests для game-core, content schemas и backend security/config/server.
- Добавлены общие UI tokens и `theme.css` в `packages/ui-kit`.
- Добавлены стартовые Vite UI для game-client и admin.
- Добавлены GitHub Actions workflows для CI и CD.
- CD workflow приведен к серверному шаблону secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
- Добавлен production Docker Compose профиль с PostgreSQL, backend, game-client и admin.
- Добавлен HTTP nginx-конфиг для существующего общего `transcribe_nginx`.
- Создан локальный `.env.production` из `.env`; файл не коммитится.
- Инициализирован Git и подключен remote `git@github.com:pigrov/goblin-cartel.git`.
- Исправлен SSH alias на `selectel-transcribe`.
- Production env загружен на сервер в `/srv/goblin-cartel/.env.production`.
- Release-архив распакован в `/srv/goblin-cartel/current`.
- Production compose поднят на сервере.
- Nginx-конфиг установлен в `/srv/transcribe-infra/nginx/conf.d/goblin-cartel.murph.ru.conf`.
- Общий `transcribe_nginx` проверен и перезагружен.
- API проверен через IP сервера с `Host: goblin-cartel.murph.ru`.
- DNS `goblin-cartel.murph.ru` проверен: A-запись указывает на `94.26.248.8`.
- HTTP health-check по домену `http://goblin-cartel.murph.ru/api/health` проходит.
- Первый commit/push выполнен в `origin/main`.

## Измененные файлы

Основные добавленные области:

- root config: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`;
- CI/CD: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`;
- backend: `apps/backend`;
- frontend: `apps/game-client`, `apps/admin`;
- packages: `packages/game-core`, `packages/content-schemas`, `packages/ui-kit`;
- deploy: `deploy`, `compose.yaml`, `scripts/deploy/bootstrap-server.sh`;
- docs: `docs/11_ci_cd_server.md`, текущая итерация.

## Проверки

Запущено локально:

```text
pnpm encoding:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @goblin-cartel/backend db:check
pnpm build
docker compose --env-file .env.production -f deploy\docker-compose.prod.yml config --quiet
```

Результат: пройдено.

Серверные проверки:

```text
docker compose --env-file .env.production -f deploy/docker-compose.prod.yml ps
curl -H "Host: goblin-cartel.murph.ru" http://94.26.248.8/api/health
curl -I -H "Host: goblin-cartel.murph.ru" http://94.26.248.8/
curl -I -H "Host: goblin-cartel.murph.ru" http://94.26.248.8/admin/
```

Результат: контейнеры подняты, backend health отвечает `200`, game-client и admin возвращают `200`.

## UTF-8 и текст

Все новые текстовые файлы должны пройти `tools/check-text-encoding.ps1`.

## CI/CD и миграции

Подготовлено:

- GitHub Actions CI;
- GitHub Actions CD по push в `main` или вручную;
- миграции через drizzle-kit перед стартом backend;
- health-check после деплоя.

- SSH alias `selectel-transcribe` работает как `deploy@94.26.248.8`;
- Docker и Docker Compose на сервере установлены;
- общий `transcribe_nginx` уже занимает 80/443, поэтому отдельный Caddy для проекта не используется;
- проектные контейнеры подключаются к внешней Docker-сети `web`;
- `deploy` входит в группу `docker`;
- `/srv/goblin-cartel` создан и доступен пользователю `deploy`.

## Открытые вопросы

1. Убедиться, что для репозитория доступны GitHub Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
2. После проверки автоматического deploy workflow выпустить TLS-сертификат и заменить HTTP nginx-конфиг на HTTPS.
