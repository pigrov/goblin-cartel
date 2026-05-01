# 0065 goblin hut progression

## Контекст

- После появления постоянных шахт и автосбора понадобился отдельный игровой слой для развития гоблинов.
- Роли уже были в контенте (`miner`, `collector`, `builder`, `foreman`), но уровень гоблина не сохранялся и не влиял на экономику.
- Сборщики должны иметь общий навык автосбора с `X` шахт, а прокачка должна увеличивать слоты и профильные бонусы.

## Сделано

- В `@goblin-cartel/game-core` добавлена модель `GoblinRosterState.goblinLevels`.
- Добавлены расчеты:
  - максимальный уровень гоблина;
  - стоимость следующего уровня;
  - эффективные статы по уровню;
  - эффективные ability effects по уровню;
  - операция `upgradeGoblin`.
- В content schema добавлен блок `goblins[].leveling`:
  - `maxLevel`;
  - `cost`;
  - `statGrowthPerLevel`;
  - `autoCollectSlotsPerLevel`;
  - `mineCapacityMultiplierPerLevel`;
  - `mineProductionMultiplierPerLevel`.
- Starter content получил баланс прокачки для шахтеров, сборщиков, строителей и бригадира.
- Экран гоблинов в клиенте превращен в “Хижину”:
  - сводка по ролям;
  - уровень каждого гоблина;
  - эффект текущего уровня;
  - стоимость и кнопка прокачки для нанятых гоблинов.
- Уровень гоблина теперь влияет на:
  - урон шахтеров;
  - слоты автосбора сборщиков;
  - бонусы вместимости/добычи назначенных сборщиков;
  - offline и online автосбор постоянных шахт.
- Админ-форма гоблина получила поля прокачки и строки стоимости уровня.

## Проверки

- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-client test -- goblinHutClientState.test.ts builtMineClientState.test.ts`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/content-schemas typecheck`
- `pnpm --filter @goblin-cartel/game-core typecheck`

## Следующее

- Развести поведение ролей глубже: шахтеры работают в руднике, строители ускоряют строительство/апгрейды, сборщики занимаются постоянными шахтами.
- Добавить в Хижину фильтр по ролям и более явные причины блокировки найма.
- Вынести баланс найма/прокачки в отдельные админ-шаблоны для быстрых пресетов.
