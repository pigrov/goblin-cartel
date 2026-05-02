# Итерация 0077: Client app refactor

## Цель

- Разрезать большой `apps/game-client/src/ui/App.tsx` на зоны ответственности перед продолжением игровых механик.
- Сохранить текущее поведение клиента без изменения баланса, контента, сохранений и backend-контрактов.
- Вернуть обязательную документацию итерации после быстрого рефакторинга и подготовить изменения к production deploy.

## Решения

- `App.tsx` оставлен shell-компонентом: HUD, основной контент, панель энергии босса, overlay-слой и нижняя навигация.
- Верхнеуровневая оркестрация React state/hooks перенесена в `useGameController`.
- Сборка view-model для экранов и модалок вынесена в `gameViewModels.ts`, чтобы контракты `GameMainContent` и `GameOverlays` были стабильнее.
- Основные экраны перенесены в `apps/game-client/src/ui/screens/`, а бизнес-логика осталась в отдельных controller hooks.
- `RewardChestStage` сделан общим экспортируемым типом из `useRewardChestFlow`, без локальных дублей в UI-компонентах.

## Сделано

- Вынесены screen-компоненты:
  - `ResourceHud`
  - `BossEnergyPanel` / `BossDetailsModal`
  - `BottomNav`
  - `MineScreen`
  - `GoblinManagementScreens`
  - `BuiltMinesSection`
  - `FoundVeinModal`
  - `MineCompletionModal`
  - `RewardChestScreen`
  - `SettingsModal`
  - `BossCardsModal`
  - `GameMainContent`
  - `GameOverlays`
- Вынесены controller hooks:
  - `useBossEnergy`
  - `useBossCardsController`
  - `useGoblinPlacement`
  - `useGoblinRosterController`
  - `useBuiltMinesController`
  - `useMineProgressionController`
  - `useMiningLoop`
  - `useRewardChestFlow`
  - `useGameBootstrap`
  - `useGamePersistence`
  - `useGameUiController`
  - `useMineUiController`
  - `useGameController`
- `App.tsx` уменьшен до shell-компонента на 29 строк.
- Сохранены текущие UX-фичи: Pixi mine scene, drag goblins, boss energy/cards, reward chest flow, found vein modal, built mines, goblin hut/base screens.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `git diff --check`

Перед production deploy дополнительно запускается полный набор:

- `pnpm encoding:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @goblin-cartel/backend db:check`
- `pnpm build`
- `git diff --check`

## Production deploy

- Deploy workflow: `.github/workflows/deploy.yml`.
- Trigger: push в `main`.
- Domain: `goblin-cartel.murph.ru`.
- Server path: `/srv/goblin-cartel`.
- Workflow сам выполняет quality gate, собирает archive, раскатывает через SSH, перезапускает Docker Compose и проверяет `https://goblin-cartel.murph.ru/api/health`.

## Открытые вопросы

- После деплоя стоит вернуться к gameplay-развитию, а не продолжать дробить `App.tsx`: текущая граница уже достаточна для безопасной разработки новых экранов и механик.
- Возможные следующие игровые направления: здания базы, баланс сундуков/карт, расширение шахт и экономики постоянных шахт.
