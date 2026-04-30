# 0036 Pixi Drag Input Lift Rail

## Цель

Вынести drag placement из `MinePixiScene.tsx` в input-модуль и синхронизировать шахтную рельсу с анимацией спуска платформы.

## Сделано

- Drag placement перенесен в `bindMinePixiDragPlacement` внутри `minePixiInput.ts`.
- `MinePixiScene.tsx` больше не содержит pointermove/pointerup-логику перетаскивания гоблинов.
- Добавлен общий расчет геометрии подъемника в `minePixiLiftGeometry.ts`.
- Подъемник и тросы смещены еще на 2 px влево: общий offset теперь `-6px` от `layout.gridX`.
- Верхние тросы подъемника рисуются до входа в шахту, а шахтная рельса живет в background layer.
- Рельса стала анимируемой: ticker меняет ее высоту вместе с текущим offset платформы во время спуска.
- Добавлен unit test для синхронизации высоты рельсы и offset платформы в `minePixiTicker.test.ts`.

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
- Локальный визуальный скриншот `tmp-pixi-drag-input-lift-rail-check.png`: проверены сдвиг подъемника и положение рельсы.

## Открытые вопросы

- Следующим шагом можно вынести создание/очистку Pixi app и scene layers, чтобы `MinePixiScene.tsx` остался почти только с React lifecycle и вызовами модулей.
