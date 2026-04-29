# 0010 goblin content

**Дата:** 2026-04-29
**Статус:** реализовано локально

## Цель

Заложить базовый content slice для гоблинов: схема, стартовый контент, хранение в версиях контента и первое отображение бригады в игровом клиенте без локального хардкода имен.

## Входной контекст

- MVP требует P0-экран и механику гоблинов.
- Игровой клиент уже берет ресурсы, блоки, шахты и локализацию из `contentBundle`.
- До этой итерации бригада в клиенте была временно захардкожена в JSX.
- Таблица `content_entities` позволяет добавлять новые JSON-сущности без новой миграции.

## Решения

1. Добавить `goblins` в content bundle как массив сущностей.
2. Хранить гоблинов в `content_entities` как `entityType=goblin`.
3. Оставить обратную совместимость: старые опубликованные версии без goblins должны возвращать `goblins: []`.
4. Проверять ссылки гоблинов на ресурсы и локализацию в общей валидации контента.
5. В клиенте показывать первые сущности бригады из content bundle, а не локальный список имен.

## Сделано

- Добавлены схемы `goblin`, `goblinAbility`, `goblinUnlockRequirement`, `resourceAmount`.
- В `contentBundle` добавлено поле `goblins` с default `[]` для старых версий контента.
- В `starterContentBundle` добавлены 8 MVP-гоблинов из roadmap.
- В `localization.ru` добавлены имена, описания гоблинов и способности.
- `validateContentBundle` проверяет дубли goblin id, ссылки hire cost на ресурсы, unlock requirements на ресурсы/шахты и localization keys.
- Backend content service восстанавливает `goblins` из `content_entities`.
- Backend content store сохраняет гоблинов как `entityType=goblin`.
- Admin content JSON тип обновлен под новое поле `goblins`.
- Game-client показывает бригаду из content bundle вместо локального JSX-хардкода.
- Для старого опубликованного контента без `goblins` или с пустым массивом клиент использует fallback из `starterContentBundle.goblins`.
- Добавлены unit tests для goblin schema, missing hire cost resource и missing goblin localization key.

## Измененные файлы

- `packages/content-schemas/src/index.ts`
- `packages/content-schemas/src/index.test.ts`
- `apps/backend/src/admin/content.ts`
- `apps/backend/src/admin/content-store.ts`
- `apps/backend/src/admin/content.test.ts`
- `apps/admin/src/ui/App.tsx`
- `apps/game-client/src/ui/App.tsx`
- `apps/game-client/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0010_goblin_content/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/content-schemas test
pnpm --filter @goblin-cartel/content-schemas typecheck
pnpm --filter @goblin-cartel/backend typecheck
pnpm --filter @goblin-cartel/backend test
pnpm --filter @goblin-cartel/game-client typecheck
pnpm --filter @goblin-cartel/admin typecheck
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm --filter @goblin-cartel/backend db:check
pnpm build
git diff --check
```

Результат: пройдено.

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не планируется: используется существующая таблица `content_entities`.

CI/CD будет запущен после коммита и push.

## Открытые вопросы

- Полноценный найм, активная команда и экран гоблинов остаются следующим слоем поверх content slice.
