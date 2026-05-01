# Iteration 0073 - Boss Card Visuals And Goblin Grab

## Context

- Boss cards were moved into content/admin in iteration `0072`, but the game still rendered all cards with one generic visual.
- Chest rewards already contain Elixir and card resources, but balancing those drops from the admin chest form was hard to scan.
- Pixi goblins were still difficult to grab on touch devices.

## Changes

- Added `assetId` to boss card content with backwards-compatible schema defaults.
- Added starter boss card asset IDs for hit damage, crit chance, crit multiplier, and max energy.
- Added runtime backfill for legacy boss cards that do not yet have `assetId`.
- Rendered Boss cards with effect-specific visuals and icons in the game modal.
- Added `Asset ID` editing to the admin Boss cards form and draft-card template.
- Added a compact chest-form drop summary for Elixir and Boss card resources.
- Increased the invisible Pixi goblin grab hit area by `1.5x`.

## Verification Plan

- Unit tests for content schema, admin draft tools, runtime content backfill, and Pixi goblin hit area.
- Full project checks: typecheck, lint, test, build, encoding check, and whitespace diff check.

