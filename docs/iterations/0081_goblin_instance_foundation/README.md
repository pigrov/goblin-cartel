# 0081 goblin instance foundation

## Цель

Заложить фундамент для индивидуальных гоблинов: случайного найма, rolled stats, traits, экипировки, истории вклада и будущего черного рынка, не ломая текущую систему найма контентных гоблинов.

## Входной контекст

- До этой итерации roster хранил только `hiredGoblinIds`, `goblinLevels` и уровень Хижины.
- Это удобно для фиксированных гоблинов из content, но плохо подходит для уникальных экземпляров, которые игрок будет роллить, прокачивать, экипировать и потенциально продавать.
- Нельзя сразу переписывать весь UI и механику найма, потому что текущие гоблины уже используются в руднике, Хижине, сборщиках, бригадирах и офлайн-добыче.

## Решения

- Добавить `GoblinRosterInstance` рядом со старой моделью, а не вместо нее.
- Существующие `hiredGoblinIds` остаются совместимым списком нанятых шаблонов.
- `instances` становятся новым слоем для будущих уникальных гоблинов.
- Текущие контентные гоблины при загрузке превращаются в стабильные template-backed instances с id вида `template:<goblinId>`.
- Уровень гоблина пока синхронизируется с прежним `goblinLevels`; если значения разойдутся, берется безопасный максимум и затем ограничивается `maxLevel`.
- Рандомный найм и reveal-экран пока не включаются, чтобы не смешивать foundation и новую механику.

## Сделано

- В `game-core` добавлены типы:
  - `GoblinRosterRarity`;
  - `GoblinRosterInstance`;
  - `GoblinRosterInstanceTrait`;
  - `GoblinRosterInstanceEquipment`;
  - `GoblinRosterInstanceLifetimeStats`.
- В `GoblinRosterState` добавлено optional-поле `instances`.
- Добавлен `ensureGoblinRosterInstances`, который достраивает экземпляры для уже нанятых гоблинов.
- Добавлен `createGoblinTemplateInstance` для стабильных экземпляров текущих content-гоблинов.
- `normalizeGoblinRoster` теперь нормализует `instances`, если они уже есть в roster.
- `hireGoblin` и `upgradeGoblin` обновляют `instances`, если roster уже работает в instance-режиме.
- `getGoblinLevel` учитывает instance level и старый `goblinLevels`.
- При bootstrap игрового клиента сохраненный roster теперь дополняется instances.
- Stable player save сохраняет и восстанавливает `instances`.

## Измененные файлы

- `packages/game-core/src/goblin-roster.ts`
- `packages/game-core/src/goblin-roster.test.ts`
- `apps/game-client/src/ui/useGameBootstrap.ts`
- `apps/game-client/src/ui/playerSave.test.ts`
- `docs/iterations/README.md`

## Проверки

- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/game-client test -- playerSave.test.ts`
- `pnpm --filter @goblin-cartel/game-client typecheck`

Перед завершением итерации дополнительно выполняется общий чек:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm encoding:check`
- `git diff --check`

## UTF-8 и текст

- Документация добавлена в UTF-8.
- Новых пользовательских русских UI-строк в этой итерации нет.

## CI/CD и миграции

- Миграций БД нет.
- Изменение пока локальное, без production push/deploy до отдельного решения.

## Открытые вопросы

- Следующая итерация: добавить content/admin правила генерации случайного гоблина.
- После этого сделать покупку контракта и reveal результата.
- Позже привязать `rolledStats`, traits и equipment к реальным формулам урона, офлайн-добычи и сборщиков.
