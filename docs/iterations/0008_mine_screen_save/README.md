# 0008 mine screen save

**Дата:** 2026-04-29
**Статус:** реализовано локально

## Цель

Улучшить первый экран рудника: читаемые названия, состояния повреждения блоков, активный блок и локальное сохранение прогресса.

## Входной контекст

- Game-client уже загружает опубликованный content bundle или fallback.
- Mining loop уже умеет бить блоки и начислять награды.
- Нужен первый слой player save до полноценной серверной модели игроков.

## Решения

1. Сохранение состояния шахты держать в `game-core` как сериализуемый `MiningSessionSave`.
2. В game-client хранить save в `localStorage`.
3. Восстанавливать save только если совпадает версия контента, mine template и seed.
4. Пока использовать локальную таблицу русских названий для `nameKey`, до полноценного localization bundle.

## Сделано

- В `packages/game-core` добавлен сериализуемый `MiningSessionSave`.
- Добавлены helpers:
  - `exportMiningSessionSave`;
  - `restoreMiningSession`.
- Save хранит:
  - mine template id;
  - seed;
  - ресурсы;
  - поврежденные и разрушенные блоки.
- Restore отклоняет save для другой шахты или seed.
- Добавлены unit tests для export/restore и mismatch case.
- Game-client сохраняет прогресс в `localStorage` под ключом `goblin-cartel.player.mine-save.v1`.
- Game-client восстанавливает save только при совпадении content version.
- Сброс шахты перезаписывает local save новым пустым состоянием.
- Добавлена локальная таблица русских названий для стартовых `nameKey`.
- Блоки получили визуальные стадии повреждения:
  - chipped;
  - cracked;
  - breaking;
  - destroyed.
- Активный блок подсвечивается.
- После разрушения блока активная цель переключается на следующий доступный блок.

## Измененные файлы

- `packages/game-core/src/mining-session.ts`
- `packages/game-core/src/mining-session.test.ts`
- `apps/game-client/src/ui/App.tsx`
- `apps/game-client/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0008_mine_screen_save/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/game-core test
pnpm --filter @goblin-cartel/game-core typecheck
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

Миграции не нужны.

## Открытые вопросы

Нет.
