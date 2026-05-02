import type { BlockTypeConfig, GoblinConfig } from "@goblin-cartel/content-schemas";
import { getGoblinLevel, type MiningBlockState, type MiningSession } from "@goblin-cartel/game-core";
import { Hammer, Plus, X } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import type { ForemanAssignments } from "../foremanTowerState";
import { createGoblinIdentity } from "../goblinHutClientState";
import type { MinePixiForemanSlot, MinePixiGoblin, MinePixiHitEffect } from "../MinePixiScene";
import {
  getGoblinOfflineAutoDamageMultiplier,
  getGoblinOfflineRelocationSlots,
  getGoblinOfflineRewardMultiplier
} from "../useGoblinPlacement";

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
  elevatorLevel: number;
  exposedCellKeys: ReadonlySet<string>;
  foremanTower: {
    assignedForemen: GoblinConfig[];
    assignments: ForemanAssignments;
    availableForemen: GoblinConfig[];
    goblinLevels: Record<string, number>;
  };
  goblins: MinePixiGoblin[];
  hitEffects: MinePixiHitEffect[];
  labels: Record<string, string>;
  loading: boolean;
  onBlockHit: (block: MiningBlockState) => void;
  onAssignForemanSlot: (slotIndex: number, goblinId: string | null) => void;
  onOpenGoblins: () => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  session: MiningSession;
}) {
  const [foremanPickerOpen, setForemanPickerOpen] = useState(false);
  const pixiForemen = useMemo<MinePixiForemanSlot[]>(() => {
    const foremanById = new Map(props.foremanTower.availableForemen.map((goblin) => [goblin.id, goblin]));

    return props.foremanTower.assignments.map((goblinId) => {
      const foreman = goblinId ? foremanById.get(goblinId) ?? null : null;

      if (!foreman) {
        return null;
      }

      return {
        id: foreman.id,
        name: createGoblinIdentity(foreman, props.labels).name,
        rarity: foreman.rarity
      };
    });
  }, [props.foremanTower.assignments, props.foremanTower.availableForemen, props.labels]);

  if (props.loading) {
    return <MineLoadingState />;
  }

  return (
    <section className="mine-screen-stage">
      <Suspense fallback={<MineLoadingState />}>
        <MinePixiScene
          activeCell={props.activeCell}
          blockTypeById={props.blockTypeById}
          currentPlatformRow={props.currentPlatformRow}
          depthMarkerLabel={props.depthMarkerLabel}
          elevatorLevel={props.elevatorLevel}
          exposedCellKeys={props.exposedCellKeys}
          foremen={pixiForemen}
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
      <ForemanTowerButton
        assignedCount={props.foremanTower.assignedForemen.length}
        onOpen={() => setForemanPickerOpen(true)}
      />
      {foremanPickerOpen ? (
        <ForemanTowerModal
          foremanTower={props.foremanTower}
          labels={props.labels}
          onAssign={props.onAssignForemanSlot}
          onClose={() => setForemanPickerOpen(false)}
          onOpenGoblins={() => {
            setForemanPickerOpen(false);
            props.onOpenGoblins();
          }}
        />
      ) : null}
    </section>
  );
}

export function MineLoadingState() {
  return (
    <section className="mine-content-loading">
      <span>Загрузка рудника...</span>
    </section>
  );
}

function ForemanTowerButton(props: { assignedCount: number; onOpen: () => void }) {
  return (
    <button className="foreman-tower-button" onClick={props.onOpen} type="button" aria-label="Вышка бригадира">
      <Hammer size={17} />
      <span>{props.assignedCount}/3</span>
    </button>
  );
}

function ForemanTowerModal(props: {
  foremanTower: {
    assignedForemen: GoblinConfig[];
    assignments: ForemanAssignments;
    availableForemen: GoblinConfig[];
    goblinLevels: Record<string, number>;
  };
  labels: Record<string, string>;
  onAssign: (slotIndex: number, goblinId: string | null) => void;
  onClose: () => void;
  onOpenGoblins: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const assignedById = new Set(props.foremanTower.assignments.filter((id): id is string => Boolean(id)));

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="foreman-modal" aria-label="Вышка бригадира" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник</p>
            <strong>Вышка бригадира</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="foreman-slot-grid" aria-label="Слоты вышки">
          {props.foremanTower.assignments.map((goblinId, index) => {
            const foreman = goblinId ? props.foremanTower.availableForemen.find((goblin) => goblin.id === goblinId) ?? null : null;

            return (
              <button
                className={selectedSlot === index ? "foreman-slot active" : "foreman-slot"}
                key={index}
                onClick={() => setSelectedSlot(index)}
                type="button"
              >
                {foreman ? (
                  <>
                    <strong>{createGoblinIdentity(foreman, props.labels).name}</strong>
                    <span>{getGoblinLevel({ goblinLevels: props.foremanTower.goblinLevels, hiredGoblinIds: [foreman.id] }, foreman.id)} ур.</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>пусто</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="foreman-effect-summary">
          <span>Перестановки: {sumForemanRelocations(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels)}</span>
          <span>Офлайн-урон: x{formatMultiplier(sumForemanDamage(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels))}</span>
          <span>Офлайн-добыча: x{formatMultiplier(sumForemanRewards(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels))}</span>
        </div>

        <div className="foreman-list" aria-label="Купленные бригадиры">
          {props.foremanTower.availableForemen.length > 0 ? (
            props.foremanTower.availableForemen.map((foreman) => {
              const level = props.foremanTower.goblinLevels[foreman.id] ?? 1;
              const identity = createGoblinIdentity(foreman, props.labels);
              const assigned = assignedById.has(foreman.id);

              return (
                <article className={assigned ? "foreman-picker-card assigned" : "foreman-picker-card"} key={foreman.id}>
                  <div>
                    <strong>{identity.fullName}</strong>
                    <span>
                      {getGoblinOfflineRelocationSlots(foreman, level)} перест. · x
                      {formatMultiplier(getGoblinOfflineAutoDamageMultiplier(foreman, level))} урон · x
                      {formatMultiplier(getGoblinOfflineRewardMultiplier(foreman, level))} добыча
                    </span>
                  </div>
                  <button onClick={() => props.onAssign(selectedSlot, foreman.id)} type="button">
                    {assigned ? "переставить" : "назначить"}
                  </button>
                </article>
              );
            })
          ) : (
            <div className="foreman-empty">
              <strong>Бригадиров пока нет</strong>
              <span>Сначала найми бригадира в Хижине, потом назначь его в слот вышки.</span>
              <button onClick={props.onOpenGoblins} type="button">В Хижину</button>
            </div>
          )}
        </div>

        {props.foremanTower.assignments[selectedSlot] ? (
          <button className="foreman-clear-button" onClick={() => props.onAssign(selectedSlot, null)} type="button">
            Снять со слота
          </button>
        ) : null}
      </section>
    </div>
  );
}

function sumForemanRelocations(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce((total, foreman) => total + getGoblinOfflineRelocationSlots(foreman, levels[foreman.id] ?? 1), 0);
}

function sumForemanDamage(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce(
    (multiplier, foreman) => multiplier + getGoblinOfflineAutoDamageMultiplier(foreman, levels[foreman.id] ?? 1) - 1,
    1
  );
}

function sumForemanRewards(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce(
    (multiplier, foreman) => multiplier + getGoblinOfflineRewardMultiplier(foreman, levels[foreman.id] ?? 1) - 1,
    1
  );
}

function formatMultiplier(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/u, "");
}
