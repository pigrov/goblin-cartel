# 0092 goblin generation template cleanup

## Цель

Убрать шаблонных гоблинов из content/runtime полностью и перенести ключевой баланс случайного найма в генерацию.

## Сделано

- `goblinGeneration.archetypes[]` теперь содержит `specialization`, `ability`, `leveling` и `renderPool`.
- При ролле случайного гоблина `ability`, `leveling`, `specialization`, `assetId` и `archetypeId` сохраняются в конкретный `roster.instances[]`.
- Апгрейд случайного гоблина использует `instance.leveling`, поэтому правка шаблона больше не меняет уже нанятого гоблина.
- Клиент строит runtime-гоблина из instance snapshot, включая рендер, умение, прокачку и специализацию.
- Поле `content.goblins`, entity type `goblin`, backend route `/entities/goblin/...` и UI старых шаблонных гоблинов удалены без fallback.
- В `game-core` удалена модель `templateId` для гоблинов: instance теперь ссылается на контракт генерации через `archetypeId`, а старые `template:*` instance-id больше не создаются.
- В форме `Генерация` добавлены поля специализации, ability JSON, leveling JSON и загрузка render pool для каждого контракта.
- Контент-валидация требует `ability`, `leveling` и непустой `renderPool` у каждого архетипа генерации.
- Starter content пересобран на 10 рудников шириной 7 клеток с глубиной от 3 до 10 рядов.
- Пул генерации получил 120 имен и 120 прозвищ для случайных гоблинов.

## Проверки

- `pnpm --filter @goblin-cartel/admin typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/content-schemas test` - пройдено.
- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster` - пройдено.
- `pnpm --filter @goblin-cartel/game-client test` - пройдено.
- `pnpm --filter @goblin-cartel/game-client typecheck` - пройдено.
- `pnpm typecheck` - пройдено.
- `pnpm test` - пройдено.
- `pnpm lint` - пройдено.
- `pnpm --filter @goblin-cartel/backend db:check` - пройдено.
- `pnpm build` - пройдено.
- `pnpm encoding:check` - пройдено.

## Следующий шаг

- Сделать более удобные typed-формы для `ability` и `leveling` внутри генерации вместо JSON-полей, когда набор эффектов стабилизируется.
