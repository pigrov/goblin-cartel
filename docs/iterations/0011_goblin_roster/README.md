# 0011 goblin roster

**Дата:** 2026-04-29
**Статус:** реализовано локально

## Цель

Сделать первый игровой слой поверх goblin content: локальное состояние нанятых гоблинов, базовый найм за ресурсы, расчет силы бригады для удара по блоку и первый экран "Гоблины" в игровом клиенте.

## Входной контекст

- В `0010_goblin_content` добавлены схемы и starter content для 8 MVP-гоблинов.
- Текущая production-версия контента `0.0.2` пока legacy и возвращает `goblins: []`.
- Game-client уже умеет использовать fallback-гоблинов из `starterContentBundle`.
- Логика добычи живет в `packages/game-core`, поэтому правила состава тоже должны быть тестируемыми там.

## Решения

1. Логику состава гоблинов держать в `packages/game-core`, а не в React.
2. Состояние нанятых гоблинов пока хранить локально в браузере по content version.
3. Первый бесплатный гоблин из starter/content автоматически попадает в бригаду.
4. Удар по блоку считается как базовый удар босса плюс сила нанятых гоблинов.
5. Для legacy production content с `goblins: []` продолжать использовать fallback из `starterContentBundle.goblins`.

## Сделано

- Добавлен `packages/game-core/src/goblin-roster.ts`.
- Реализованы `createInitialGoblinRoster`, `normalizeGoblinRoster`, `canHireGoblin`, `hireGoblin`, `calculateCrewHitDamage`.
- Добавлены unit tests для стартового состава, нормализации, расчета урона, найма, блокировки по требованиям и нехватки ресурсов.
- Game-client сохраняет roster в `localStorage` отдельно от mine save.
- Удар босса теперь использует расчет `bossBaseDamage + crew damage`.
- Вкладка "Гоблины" показывает список гоблинов, стоимость, статус найма и силу.
- Найм списывает ресурсы из текущей mining session и сразу сохраняется.
- Нижняя навигация переключает "Рудник" / "Гоблины"; будущие разделы пока заблокированы.

## Измененные файлы

- `packages/game-core/src/goblin-roster.ts`
- `packages/game-core/src/goblin-roster.test.ts`
- `packages/game-core/src/index.ts`
- `apps/game-client/src/ui/App.tsx`
- `apps/game-client/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0011_goblin_roster/README.md`

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
git diff --check
```

Результат: пройдено.

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не планируется: состояние игрока пока хранится локально в браузере.

## Открытые вопросы

- Серверное сохранение игрока, полноценный баланс найма и отдельная экономика шахт остаются следующими итерациями.
