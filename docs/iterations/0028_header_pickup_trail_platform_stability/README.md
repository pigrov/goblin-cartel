# Iteration 0028: Header, Pickup Trail, Platform Stability

## Goal

Improve the mobile game header, make resource gain feel connected to the resource bar, and remove platform drop restarts during normal goblin hits.

## Changes

- Replaced the top text resource cards with compact resource icon counters.
- Removed the separate mine header with `Content ...`, reset, and settings icons from the main game surface.
- Added a burger menu in the top-right header.
- Moved mine info, content version/status, and reset action into the burger settings modal.
- Added a browser confirmation before resetting the local mine.
- Added DOM pickup trails that fly mined rewards from the block area to the matching top resource counter.
- Fixed platform drop animation restart: platform drop timing now starts only when the platform actually begins a new row drop.
- Re-rendering the platform during a hit now preserves the current drop offset instead of jumping back to the start.
- Added local dev long-mine fixture support with `?debugMineRows=60`.
- Added layout coverage for a 60-row mine to keep the visible render window bounded.

## Checks

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- Headless Chrome visual check:
  - header has 3 compact resource counters and no text resource labels;
  - old `.mine-header` is absent and `Content ...` is not visible on the main screen;
  - burger opens the settings modal with reset action and info rows;
  - destroying a block creates pickup trail elements and adds `stone` to local resources;
  - `?debugMineRows=60` creates a 3216px-tall Pixi canvas with a 492px visible playfield and `fallback:debug-60` content version.

## Next Steps

- Add resource icon sprites inside Pixi itself so the block-level reward label, DOM trail, and top resource counter use the same visual language.
- Add a small performance overlay in dev mode for Pixi FPS and rendered cell count.
