# 0085 Random Goblin Instance Upgrades

## Цель

Дать игроку возможность улучшать конкретного случайного гоблина, чтобы вложения шли в выбранный экземпляр, а не в общий шаблон.

## Сделано

- `upgradeGoblin` в `game-core` теперь принимает как template id, так и rolled instance id.
- Для rolled-гоблина стоимость улучшения считается по template balance, но уровень повышается только у конкретного `GoblinRosterInstance`.
- Template-гоблин того же типа больше не получает уровень случайного экземпляра.
- В Хижине блок личных гоблинов показывает уровень конкретного экземпляра и кнопку улучшения.
- Сообщение после улучшения использует имя и прозвище rolled-гоблина.
- Добавлен unit test на апгрейд rolled instance без прокачки template.

## Проверки

- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
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

- Нужно сделать полноценную карточку деталей конкретного гоблина: статы после следующего уровня, особенности, будущие предметы/артефакты.
- Для случайных сборщиков и бригадиров нужен отдельный UX назначения как экземпляров, а не шаблонов.
