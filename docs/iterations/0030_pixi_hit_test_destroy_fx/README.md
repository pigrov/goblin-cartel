# Iteration 0030: Pixi Hit-Test And Destroy FX

## Goal

Make the Pixi dev overlay more useful for input debugging and make block destruction feel more physical without changing mining rules.

## Changes

- Extended the Pixi dev overlay with live hit-test data:
  - last mine/platform cell under pointer;
  - hit-test state (`mine exposed`, `mine covered`, `platform`, `void`, etc.);
  - canvas-local pointer coordinates;
  - current selected cell.
- Hit-test overlay updates on pointer move and immediately on pointer down while the overlay setting is enabled.
- Added a Pixi-only block fracture frame on destruction.
- Added larger collapse shards using the destroyed block's own color, with short spin/fall animation.
- Kept damage numbers, reward labels, particles, boss energy, exposed-cell rules, and reward logic in the existing flow.

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
- Headless Chrome local visual/input check:
  - Pixi dev overlay reports `Hit 0:0`, `mine exposed`, `XY 70,170`, and `Sel 0:0`;
  - boss energy changes during pointerdown on the exposed block;
  - destruction feedback remains inside the Pixi canvas.

## Notes

- The new hit-test fields are shown only when the existing Pixi dev overlay toggle is enabled.
- The collapse effect is still procedural `Graphics`; this keeps the iteration asset-free until shared resource/block sprites are chosen.

## Next Steps

- Split the Pixi effect helpers into a small module once hit effects grow again.
- Add richer per-block visual states for near-destroyed blocks before the final hit.
