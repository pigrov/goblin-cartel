import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import { lazy, Suspense } from "react";
import type { MinePixiGoblin, MinePixiHitEffect } from "../MinePixiScene";

const MinePixiScene = lazy(async () => {
  const module = await import("../MinePixiScene");
  return { default: module.MinePixiScene };
});

export function MineScreen(props: {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
  depthMarkerLabel: (row: number) => string;
  devOverlayEnabled: boolean;
  exposedCellKeys: ReadonlySet<string>;
  goblins: MinePixiGoblin[];
  hitEffects: MinePixiHitEffect[];
  loading: boolean;
  onBlockHit: (block: MiningBlockState) => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  session: MiningSession;
}) {
  if (props.loading) {
    return <MineLoadingState />;
  }

  return (
    <Suspense fallback={<MineLoadingState />}>
      <MinePixiScene
        activeCell={props.activeCell}
        blockTypeById={props.blockTypeById}
        currentPlatformRow={props.currentPlatformRow}
        depthMarkerLabel={props.depthMarkerLabel}
        exposedCellKeys={props.exposedCellKeys}
        goblins={props.goblins}
        hitEffects={props.hitEffects}
        onBlockHit={props.onBlockHit}
        onPlaceGoblin={props.onPlaceGoblin}
        devOverlayEnabled={props.devOverlayEnabled}
        platformCellKeys={props.platformCellKeys}
        platformDropAnimating={props.platformDropAnimating}
        session={props.session}
      />
    </Suspense>
  );
}

export function MineLoadingState() {
  return (
    <section className="mine-content-loading">
      <span>Загрузка рудника...</span>
    </section>
  );
}
