# 0035 Pixi Reconciliation Ticker

## Цель

Продолжить дробление `MinePixiScene.tsx`: вынести reconciliation блоков, hit effects и animation ticker в отдельные Pixi-модули, не меняя игровую механику.

## Сделано

- Вынесен общий тип Pixi render node и удаление render node в `minePixiRenderNodes.ts`.
- Вынесен reconciliation блоков шахты в `minePixiBlockReconciliation.ts`.
- Вынесен reconciliation hit effects и impact-состояние блоков в `minePixiHitEffectReconciliation.ts`.
- Вынесен animation ticker, анимация гоблинов/платформы/impact и dev stats в `minePixiTicker.ts`.
- `MinePixiScene.tsx` оставлен как слой orchestration: refs, lifecycle, layout effects и подключение модулей.
- Блок энергии босса сделан менее прозрачным, но остался стеклянным overlay.
- Подъемный механизм и тросы смещены на 4 px влево.
- Рельса/трос в шахте теперь отображается только до текущего уровня платформы, поэтому каждый новый спуск визуально продлевает ее вниз.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`
- Локальный визуальный скриншот `tmp-pixi-reconciliation-ticker-check.png`: проверены более плотный блок энергии, сдвинутый подъемник и укороченная рельса до уровня платформы.

## Открытые вопросы

- Следующим шагом можно вынести drag placement из `MinePixiScene.tsx` в input-модуль, чтобы сцена почти полностью осталась композиционным компонентом.
