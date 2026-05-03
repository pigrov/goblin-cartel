# 0082 goblin generation rules

## Цель

Добавить контентные правила для будущего случайного найма гоблинов: архетипы найма, веса редкости, диапазоны rolled stats, пул имен и прозвищ, traits и стоимость контракта. Это следующий слой после `0081_goblin_instance_foundation`.

## Сделано

- В `content-schemas` добавлен блок `goblinGeneration`.
- В starter content добавлены 3 архетипа:
  - `random_miner_contract`;
  - `random_collector_contract`;
  - `random_foreman_contract`.
- Для архетипов задаются:
  - шаблонный гоблин, от которого наследуется роль и базовая механика;
  - веса редкости `common`, `rare`, `epic`, `legendary`;
  - множитель статов по редкости;
  - диапазоны `strength`, `speed`, `luck`, `loyalty`;
  - пул traits;
  - стоимость найма.
- В backend content-хранилище добавлена singleton-сущность `goblinGeneration`, чтобы она сохранялась при создании, редактировании, валидации и публикации версий.
- В админке добавлен компактный редактор генерации:
  - пул имен;
  - пул прозвищ;
  - JSON архетипов найма.
- В `game-core` добавлен чистый `rollGoblinInstance`, который по seed, номеру покупки и content-архетипу детерминированно создает `GoblinRosterInstance`.
- `GoblinRosterInstance` расширен optional-полями `name` и `nickname`.

## Проверки

- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/backend test -- content.test.ts content-routes.test.ts`
- `pnpm --filter @goblin-cartel/admin test -- adminContentTools.test.ts`
- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/content-schemas typecheck`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test -- goblinHutClientState.test.ts playerSave.test.ts`

## Не включено в этот шаг

- Покупка случайного контракта в UI.
- Reveal нового гоблина после покупки.
- Переход roster на полноценное хранение нескольких гоблинов одного шаблона.
- Учет rolled stats и traits в формулах урона, офлайн-добычи, строительства и автосбора.

## Следующий шаг

Сделать покупку случайного контракта в Хижине: списание стоимости, roll экземпляра, экран reveal и сохранение результата в player save.
