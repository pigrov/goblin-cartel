# Итерация 0042: ядро жил и построенных шахт

## Цель

Начать реализацию правильного core loop из ТЗ: игрок докапывается до жилы, жила открывает постоянную шахту, шахта копит доход конкретного ресурса, игрок собирает доход из меню шахт, а автоматизация появится следующим слоем.

## Сделано

- В `@goblin-cartel/content-schemas` добавлены `veinTypes`, `builtMineTypes` и `guaranteedObjects` для `mineTemplates`.
- В стартовый контент добавлена гарантированная `copper_vein_small` в нижнем слое первого рудника.
- Добавлен тип построенной шахты `small_copper_mine`: источник `copper_vein_small`, производство `copper_ore`, доход в час, вместимость, стоимость и время строительства.
- Валидация контента теперь проверяет ссылки из жил, построенных шахт, стоимости строительства и гарантированных объектов.
- `MiningSession` теперь сохраняет `special`, `veinTypeId`, `lastFoundVein` и список `foundVeins`.
- Добавлен модуль `built-mines` в `@goblin-cartel/game-core`: постройка шахты из найденной жилы, накопление дохода с учетом capacity, ручной сбор дохода и назначение гоблина-собирателя как состояние.
- Обновлены sample configs и экономика: производство шахт фиксируется как доход в час.

## Проверки

- `pnpm --filter @goblin-cartel/content-schemas typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/content-schemas test` - пройдено.
- `pnpm --filter @goblin-cartel/game-core typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/game-core test` - пройдено.
- `pnpm --filter @goblin-cartel/backend typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/backend test` - пройдено.
- `pnpm typecheck` - пройдено.
- `pnpm test` - пройдено.
- `pnpm build` - пройдено.
- `pnpm lint` - пройдено.
- `pnpm encoding:check` - пройдено.
- `pnpm --filter @goblin-cartel/backend db:check` - пройдено.
- `git diff --check` - пройдено.

## Открытые вопросы

- Нет.
