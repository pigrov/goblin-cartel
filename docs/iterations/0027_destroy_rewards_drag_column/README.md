# Iteration 0027: Destroy Rewards And Drag Column

## Goal

Improve mine feedback after block destruction and make goblin repositioning easier on touch screens.

## Changes

- Goblin drag/drop now resolves the target by mine column, not by a narrow vertical platform zone.
- Dropping a goblin above or below the platform still places it onto the active platform cell in that column.
- Block destruction hit effects now carry reward drops from the mining result.
- Pixi destruction effects render floating reward chips with resource color and `+amount label`.
- Hit effect lifetime was extended so reward feedback has enough time to animate.

## Checks

- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`
- Headless Chrome visual check:
  - dragged starter goblin from column `0` to column `3` while releasing below the platform;
  - local save reported `goblinPlacements.gryzz_crooked_tooth = 3`;
  - destroyed a top block and local save reported resources `{ "stone": 1 }`;
  - screenshot saved as `tmp-pixi-reward-drag-check.png`.

## Next Steps

- Add richer block-break animation states: cracking frame, collapse frame, and short resource pickup trail toward the top resource bar.
- Add a larger mine template or a debug fixture for 50+ rows to keep checking scroll and Pixi culling under load.
