# 0009 content localization

**Дата:** 2026-04-29
**Статус:** реализовано локально

## Цель

Перенести названия ресурсов, блоков и шахт из временной клиентской таблицы в публикуемый content bundle.

## Входной контекст

- Game-client уже работает от опубликованного `contentBundle`.
- Названия пока временно лежат в клиенте как `nameKey -> ru label`.
- В content bundle уже есть `nameKey` и `displayNameKey`.
- Таблица `content_entities` позволяет хранить новые JSON-сущности без миграции.

## Решения

1. Добавить в content bundle поле `localization`.
2. Хранить локализацию в `content_entities` как `entityType=localization`, `entityId=locale`.
3. Сохранять обратную совместимость со старыми опубликованными версиями без localization.
4. Валидация проверяет `ru`-ключи только если `localization.ru` присутствует.
5. Game-client берет подписи из bundle, а fallback берет из `starterContentBundle.localization`.

## Сделано

- В `packages/content-schemas` добавлено поле `localization`.
- `starterContentBundle` получил `localization.ru` для стартовых ресурсов, блоков и шахты.
- `validateContentBundle` проверяет наличие `ru`-ключей, если `localization.ru` присутствует.
- Старые content bundle без `localization` остаются валидными.
- Backend content service восстанавливает `localization` из `content_entities`.
- Backend content store сохраняет `localization` как `entityType=localization`, `entityId=<locale>`.
- Game-client берет подписи из `content.localization`.
- Для старых опубликованных версий без localization game-client использует fallback из `starterContentBundle.localization`.
- Добавлены tests для legacy content без localization и отсутствующих localization keys.

## Измененные файлы

- `packages/content-schemas/src/index.ts`
- `packages/content-schemas/src/index.test.ts`
- `apps/backend/src/admin/content.ts`
- `apps/backend/src/admin/content-store.ts`
- `apps/backend/src/admin/content.test.ts`
- `apps/game-client/src/ui/App.tsx`
- `docs/iterations/README.md`
- `docs/iterations/0009_content_localization/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/content-schemas test
pnpm --filter @goblin-cartel/content-schemas typecheck
pnpm --filter @goblin-cartel/backend typecheck
pnpm --filter @goblin-cartel/backend test
pnpm --filter @goblin-cartel/game-client typecheck
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm --filter @goblin-cartel/backend db:check
pnpm build
```

Результат: пройдено.

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не нужна.

## Открытые вопросы

Нет.
