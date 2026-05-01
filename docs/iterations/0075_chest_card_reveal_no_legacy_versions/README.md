# 0075 chest card reveal no legacy versions

## Goal

Make chest opening read better when a Boss card drops, and remove early-development compatibility paths that kept old content/save versions alive.

## Changes

- Reward chest opening now picks the highest-rarity Boss card from the rolled rewards and shows it as a large reveal frame during the opening animation.
- Game client runtime content no longer patches published bundles with starter resources, Boss cards, chest rewards, localization, or reordered mine templates.
- Player save restore is strict by content version again:
  - old split localStorage keys are ignored;
  - combined save is restored only when its content version matches the active published version;
  - a new content version starts fresh progress.
- Backend content reading no longer backfills Boss cards or normalizes old chest reward tables when reading stored entities.
- Added `pnpm --filter @goblin-cartel/backend content:reset-baseline <version>` to remove old content/game versions from an environment and publish the current starter content as the single active baseline.

## Verification

- `pnpm --filter @goblin-cartel/game-client test -- playerSave.test.ts runtimeContent.test.ts`
- `pnpm --filter @goblin-cartel/backend test -- content.test.ts`
