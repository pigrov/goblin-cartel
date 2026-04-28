# 0004 admin auth

**Дата:** 2026-04-28
**Статус:** задеплоено

## Цель

Реализовать первый рабочий контур доступа в админку: bootstrap-вход по email из `APP_BOOTSTRAP_ADMIN_EMAILS`, обязательную установку пароля, обычный вход по паролю и защищенное состояние админки.

## Входной контекст

- Bootstrap email задается через `APP_BOOTSTRAP_ADMIN_EMAILS`.
- Первый вход для bootstrap email допускается без пароля.
- После установки пароля passwordless-вход должен быть отключен.
- Пароли хранятся только в виде hash.
- Сессии не должны раскрывать секреты и должны быть проверяемы backend.
- Drizzle + drizzle-kit обязательны для изменений схемы.

## Решения

1. Хранить админские сессии в PostgreSQL в таблице `admin_sessions`.
2. В БД сохранять только SHA-256 hash session token, а сам token отдавать клиенту один раз.
3. Использовать текущий `scrypt` password hashing helper.
4. Логировать bootstrap/login/password/logout события в `audit_logs`.
5. Админка использует относительный API путь `/api/admin/...`, который production nginx проксирует в backend.

## Сделано

- Добавлена таблица `admin_sessions` для backend-сессий админки.
- Добавлен auth-сервис с bootstrap-входом, обычным login, проверкой текущей сессии, установкой пароля и logout.
- Bootstrap-вход разрешен только email из `APP_BOOTSTRAP_ADMIN_EMAILS`.
- После установки пароля повторный bootstrap-вход для этого admin user отклоняется.
- Session token отдается клиенту один раз, в БД хранится только SHA-256 hash.
- Добавлены audit log события для bootstrap/login/password/logout сценариев.
- Добавлены backend routes:
  - `GET /admin/bootstrap/status`
  - `POST /admin/auth/bootstrap`
  - `POST /admin/auth/login`
  - `GET /admin/auth/me`
  - `POST /admin/auth/password`
  - `POST /admin/auth/logout`
- Admin UI получил экран первого входа, входа по паролю, обязательной установки пароля и logout.
- Admin UI хранит session token в `localStorage` под ключом `goblin-cartel.admin.session-token`.
- Production admin обращается к backend через `/api/admin/...`.
- Добавлены unit tests для auth service и routes.
- Коммит `ef4eb35` задеплоен через GitHub Actions.
- Production endpoint `https://goblin-cartel.murph.ru/api/admin/bootstrap/status` возвращает `200`.

## Измененные файлы

- `apps/backend/src/db/schema.ts`
- `apps/backend/drizzle/0001_cheerful_tana_nile.sql`
- `apps/backend/drizzle/meta/_journal.json`
- `apps/backend/drizzle/meta/0001_snapshot.json`
- `apps/backend/src/admin/auth.ts`
- `apps/backend/src/admin/auth-store.ts`
- `apps/backend/src/admin/routes.ts`
- `apps/backend/src/admin/auth.test.ts`
- `apps/backend/src/admin/routes.test.ts`
- `apps/backend/src/server.ts`
- `apps/admin/src/ui/App.tsx`
- `apps/admin/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0004_admin_auth/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/backend test
pnpm --filter @goblin-cartel/backend typecheck
pnpm --filter @goblin-cartel/admin typecheck
pnpm --filter @goblin-cartel/backend db:check
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm build
```

Результат: пройдено.

CI/CD:

```text
GitHub Actions CI: success
GitHub Actions deploy: success
```

Production smoke:

```text
https://goblin-cartel.murph.ru/ -> 200
https://goblin-cartel.murph.ru/admin/ -> 200
https://goblin-cartel.murph.ru/api/health -> 200
https://goblin-cartel.murph.ru/api/admin/bootstrap/status -> 200
```

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Drizzle migration создана через `drizzle-kit generate`:

```text
apps/backend/drizzle/0001_cheerful_tana_nile.sql
```

После push в `main` CD применил миграцию перед стартом backend.

## Открытые вопросы

Нет.
