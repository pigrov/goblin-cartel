import { BossEnergyPanel } from "./screens/BossEnergyPanel";
import { BottomNav } from "./screens/BottomNav";
import { GameMainContent } from "./screens/GameMainContent";
import { GameOverlays } from "./screens/GameOverlays";
import { ResourceHud } from "./screens/ResourceHud";
import { useGameController } from "./useGameController";

export function App() {
  const game = useGameController();

  return (
    <main className="game-shell">
      <section className="phone-frame" aria-label="Игровой экран">
        <ResourceHud {...game.resourceHud} />

        <GameMainContent {...game.mainContent} />

        {game.bossPanel.visible ? (
          <BossEnergyPanel
            config={game.bossPanel.config}
            copperAmount={game.bossPanel.copperAmount}
            displayedEnergy={game.bossPanel.displayedEnergy}
            energyPercent={game.bossPanel.energyPercent}
            elixirAmount={game.bossPanel.elixirAmount}
            feedback={game.bossPanel.feedback}
            onOpenCards={game.bossPanel.onOpenCards}
            onOpenDetails={game.bossPanel.onOpenDetails}
          />
        ) : null}

        <GameOverlays {...game.overlays} />

        <BottomNav {...game.bottomNav} />
      </section>
    </main>
  );
}
