# 0034 Pixi Background Depth Input

## Цель

Продолжить дробление `MinePixiScene.tsx` по зонам ответственности: вынести фон, метки глубины и pointer/touch input, параллельно поправить компоновку шахты и нижний блок энергии.

## Сделано

- Вынесен Pixi-фон шахты в `minePixiBackground.ts`.
- Вынесены метки глубины в `minePixiDepthMarkers.ts`.
- Вынесены обработчики pointer/touch input, hit-test dev overlay и вычисление координат canvas в `minePixiInput.ts`.
- Поверхность шахты увеличена по высоте с `132` до `198` px.
- Шахта сдвинута на 2 px влево, чтобы левая стойка платформы визуально совпадала с тросом/направляющей.
- У платформы убрана правая серая стойка.
- Возвращена тонкая левая направляющая в шахте.
- Нижний блок гоблинов убран.
- Блок энергии босса уменьшен по высоте и переведен в стеклянный overlay поверх игровой области.
- Тестовая глубина стартовой шахты увеличена до 200 метров: `40` рядов по `5` метров.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`
- Локальный визуальный скриншот `tmp-pixi-background-depth-input-check.png`: проверены поверхность, левая направляющая, отсутствие правой стойки платформы, overlay энергии и метки глубины.

## Открытые вопросы

- Следующим шагом стоит продолжить вынос логики из `MinePixiScene.tsx`: отдельно рассмотреть effects/render reconciliation или анимационный ticker.
- Для финальной игровой глубины нужно будет решить, остается ли 200 метров дефолтом или это только временный тестовый режим.
