# 0066 Goblin Roles Construction Tabs

## Цель

Развести игровые роли гоблинов и пересобрать экран хижины так, чтобы игрок видел шахтеров, сборщиков и строительную бригаду отдельными вкладками.

## Сделано

- Шахтерская добыча в руднике теперь использует только гоблинов класса `miner`.
- Сборщики остались отдельным процессом для постоянных шахт и используются в ручном/автоматическом сборе дохода.
- Строители и бригадиры вынесены в строительную поддержку: они уменьшают стоимость строительства/апгрейда и время строительства шахт через content effects.
- Экран `Хижина` получил вкладки `Все`, `Шахтеры`, `Сборщики`, `Стройка` с количеством нанятых и доступных гоблинов.
- Бригадир `krakk_iron_turnip` получил стартовый бонус `build_time_multiplier`.
- На экране постоянных шахт добавлена строка с текущим строительным бонусом.

## Тесты

- `pnpm --filter @goblin-cartel/game-core test -- built-mines.test.ts`
- `pnpm --filter @goblin-cartel/game-client test -- builtMineClientState.test.ts goblinHutClientState.test.ts`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

## Открытые вопросы

- Уровни строителей пока усиливают только общие параметры гоблина; отдельный рост строительных бонусов нужно вынести в content-схему следующей итерацией.
- Навык бригадира `auto_select_next_block` пока отображается как будущая роль управления шахтерами, но фактическая авторасстановка шахтеров еще не включена.
