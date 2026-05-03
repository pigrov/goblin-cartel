# 0084 Random Goblin Runtime Mining

## Цель

Сделать так, чтобы купленные случайные гоблины-шахтеры не только сохранялись в Хижине, но и реально работали в руднике как отдельные юниты: со своим id, именем и rolled stats.

## Сделано

- В `game-core` расчет crew damage теперь умеет брать `rolledStats` и `level` конкретного `GoblinRosterInstance`, если в ростере нанят rolled-id.
- `getGoblinLevel` теперь различает id экземпляра и template id, чтобы случайный гоблин не подменял уровень шаблонного гоблина того же типа.
- В клиент добавлен runtime-слой `createRuntimeGoblinConfigs`: из шаблонов контента и player roster собираются рабочие гоблины для шахты.
- Pixi placement и offline mining теперь используют id экземпляра, поэтому случайного шахтера можно посадить на платформу как отдельного гоблина.
- Имя на платформе для rolled-гоблина берется из экземпляра, а урон считается от его rolled stats.
- После покупки случайного шахтера клиент пробует сразу поставить его на свободное место платформы, если лимит подъемника позволяет.

## Проверки

- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/game-client test -- useGoblinPlacement.test.ts`
- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm encoding:check`
- `pnpm build`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

## Открытые вопросы

- Случайные сборщики и бригадиры пока не получили полноценное назначение на постоянные шахты/вышку как отдельные экземпляры.
- Следующий логичный шаг: улучшение конкретного rolled-гоблина, а не только шаблонных гоблинов.
