# Iteration 0074 - Chest Card Art And Rarity Balance

## Context

- Boss cards had content-driven `assetId`, but their in-game art was still close to a generic icon tile.
- Chest reward tables mixed common, rare, and golden boss cards too aggressively for early chests.
- Published legacy content can still contain old chest reward values, so new code needs a safe migration path.

## Changes

- Reworked boss card visuals into lightweight card art with frame, face, rune, and effect icon.
- Added distinct resource icons and reward colors for common, rare, and golden boss card drops.
- Enhanced chest CSS art with hinges, bands, rune/lock detail, and asset-aware tier classes.
- Rebalanced starter chest drops by card rarity:
  - wooden: common cards first, small rare chance, no golden card;
  - iron: common cards guaranteed, rare cards frequent, small golden chance;
  - steel: stronger common/rare payout and meaningful golden chance.
- Added runtime/backend normalization for known legacy chest reward values, preserving manual admin edits.
- Improved admin chest summary to show card rarity next to min/max/chance.

## Verification Plan

- Unit tests cover starter chest rarity balance, runtime legacy migration, and backend content normalization.
- Full project checks remain required before release: typecheck, lint, test, build, encoding check, and diff whitespace check.

