# Iteration 0029: Pixi Dev Overlay And Resource Tooltips

## Goal

Refine the Pixi mine feedback loop after the compact header work: remove the DOM resource pickup trail, expose Pixi debug stats from settings, make resource counters explain themselves on tap, and reduce input latency for boss hits.

## Changes

- Added a settings toggle for a Pixi dev overlay.
- The Pixi dev overlay shows FPS, visible row range, current scroll row, rendered cell count, and total cell count.
- Resource header counters now match the burger button height.
- Resource header counters open a small tooltip with resource icon, name, and current amount.
- The resource tooltip disappears after 3 seconds or immediately on tap.
- Removed the DOM pickup trail that flew mined resources into the header.
- Block destruction reward labels now stay in Pixi, run twice as long, and use text plus a small resource icon without a pill background.
- Boss hits now use direct canvas `pointerdown` cell hit-testing instead of waiting for Pixi `pointertap`.

## Checks

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`
- Headless Chrome visual/input check:
  - resource counters are 38px tall, same as the burger button;
  - resource tooltip opens, closes on tap, and auto-hides after 3 seconds;
  - `.pickup-trail` and `.pickup-trail-layer` are absent;
  - Pixi dev overlay is visible after enabling it in settings;
  - boss energy changes from `600/600` to `582/600` during pointerdown on an exposed block.

## Notes

- The browser check uses the local dev page with `?debugMineRows=60` to keep culling and overlay values visible on a long mine.
- The direct canvas hit-test still routes through `App.handleBlockHit`, so boss energy, exposed-cell rules, rewards, and hit effects remain in the existing game logic.

## Next Steps

- Add a small Pixi-only debug panel option for hit-test coordinates and selected cell if input issues continue.
- Start replacing procedural reward icons with shared resource sprites once the asset format is decided.
