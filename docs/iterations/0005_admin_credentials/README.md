# 0005 admin credentials

**Дата:** 2026-04-28
**Статус:** задеплоено

## Цель

Сделать первый рабочий раздел `Credentials` в админке: просмотр списка настроенных ключей без раскрытия значений и сохранение новых значений в зашифрованном виде через `APP_CREDENTIALS_MASTER_KEY`.

## Входной контекст

- Таблица `app_credentials` уже есть в первой миграции.
- Значения credentials должны храниться только зашифрованными.
- После сохранения секрет нельзя показывать обратно открытым текстом.
- Чтение и изменение credentials должны попадать в audit log.
- Раздел должен быть доступен только после полноценного входа и установки пароля.

## Решения

1. Не добавлять новую миграцию: текущая схема `app_credentials` уже покрывает MVP.
2. Использовать AES-256-GCM helper из `apps/backend/src/security/credentials.ts`.
3. Для списка credentials возвращать только метаданные и `hasValue: true`.
4. Для записи использовать upsert по `name`.
5. Блокировать доступ к credentials, если `mustSetPassword=true`.

## Сделано

- Добавлен backend credentials service для списка и upsert.
- Добавлен Drizzle store для таблицы `app_credentials`.
- Добавлены protected routes:
  - `GET /admin/credentials`
  - `POST /admin/credentials`
- Credentials routes требуют валидную admin session.
- Если admin user еще должен установить пароль, credentials routes возвращают `password_setup_required`.
- Значение credential шифруется через AES-256-GCM и `APP_CREDENTIALS_MASTER_KEY`.
- Список credentials возвращает только метаданные и `hasValue: true`; plaintext и encrypted payload не уходят в UI.
- Чтение списка и upsert пишутся в `audit_logs`.
- Admin UI получил переключение `Dashboard` / `Credentials`.
- Раздел `Credentials` показывает список сохраненных ключей и форму сохранения нового значения.
- После сохранения поле значения очищается, секрет обратно не отображается.
- Добавлены unit tests для credentials service и routes.
- Коммит `841405a` задеплоен через GitHub Actions.
- Production endpoint `GET /api/admin/credentials` без токена возвращает `401`.

## Измененные файлы

- `apps/backend/src/admin/credentials.ts`
- `apps/backend/src/admin/credentials-store.ts`
- `apps/backend/src/admin/credentials-routes.ts`
- `apps/backend/src/admin/credentials.test.ts`
- `apps/backend/src/admin/credentials-routes.test.ts`
- `apps/backend/src/admin/http-auth.ts`
- `apps/backend/src/admin/routes.ts`
- `apps/backend/src/server.ts`
- `apps/admin/src/ui/App.tsx`
- `apps/admin/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0005_admin_credentials/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/backend typecheck
pnpm --filter @goblin-cartel/backend test
pnpm --filter @goblin-cartel/admin typecheck
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm --filter @goblin-cartel/backend db:check
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
https://goblin-cartel.murph.ru/api/admin/credentials без токена -> 401
```

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не нужна.

## Открытые вопросы

Нет.
