# 0020 Platform Overlay Anchor Fix

## Цель

Исправить неверную привязку платформы после перевода в overlay-слой.

## Проблема

Платформа стала абсолютным слоем `.mine-platform-layer`, но родительская `.mine-grid` не была позиционированным контейнером. Из-за этого браузер привязывал платформу к ближайшему внешнему positioned-контейнеру, и визуально она прилипала к верхней части игровой области, а не к началу шахты.

## Сделано

- Для `.mine-grid` добавлен `position: relative`.
- Теперь `top/left/width/height` платформы применяются относительно шахтной сетки.
- Шахта остается цельной, платформа остается overlay-слоем.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - passed.
- `pnpm --filter @goblin-cartel/game-client build` - passed.
- `pnpm lint` - passed.
- `pnpm encoding:check` - passed.
- `pnpm test` - passed.
- `pnpm typecheck` - passed.
- `pnpm build` - passed.
- `pnpm --filter @goblin-cartel/backend db:check` - passed.
