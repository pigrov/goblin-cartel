import {
  applyBossAttack,
  createBossEnergyState,
  getBossEnergySecondsUntilReady,
  regenerateBossEnergy,
  type BossEnergyConfig,
  type BossEnergyState
} from "@goblin-cartel/game-core";
import { useCallback, useEffect, useMemo, useState } from "react";

const bossEnergyMinTickMs = 50;

export function useBossEnergy(input: { config: BossEnergyConfig; sessionReady: boolean }) {
  const [bossEnergy, setBossEnergy] = useState<BossEnergyState>(() => createBossEnergyState(input.config, Date.now()));
  const [bossDetailsOpen, setBossDetailsOpen] = useState(false);
  const [bossEnergyFeedback, setBossEnergyFeedback] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const bossEnergyTickMs = useMemo(
    () => Math.max(bossEnergyMinTickMs, Math.round(1000 / Math.max(1, input.config.regenPerSecond))),
    [input.config.regenPerSecond]
  );
  const visibleBossEnergy = useMemo(
    () => regenerateBossEnergy(bossEnergy, input.config, clockNow),
    [bossEnergy, clockNow, input.config]
  );
  const displayedBossEnergy = Math.floor(visibleBossEnergy.currentEnergy);
  const bossEnergyPercent = input.config.maxEnergy > 0 ? (displayedBossEnergy / input.config.maxEnergy) * 100 : 0;
  const bossSecondsUntilReady = useMemo(
    () => getBossEnergySecondsUntilReady(bossEnergy, input.config, clockNow),
    [bossEnergy, clockNow, input.config]
  );

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => setClockNow(Date.now()), bossEnergyTickMs);

    return () => window.clearInterval(intervalId);
  }, [bossEnergyTickMs, input.sessionReady]);

  useEffect(() => {
    if (!bossEnergyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setBossEnergyFeedback(false), 450);

    return () => window.clearTimeout(timeoutId);
  }, [bossEnergyFeedback]);

  const applyBossTap = useCallback(
    (random: () => number) => {
      const now = Date.now();
      const attack = applyBossAttack(bossEnergy, input.config, {
        now,
        random
      });

      setBossEnergy(attack.state);
      setClockNow(now);

      if (!attack.ok) {
        setBossEnergyFeedback(true);
      }

      return attack;
    },
    [bossEnergy, input.config]
  );

  const createBossEnergyStateForNow = useCallback(
    (now: number) => createBossEnergyState(input.config, now),
    [input.config]
  );

  return {
    applyBossTap,
    bossDetailsOpen,
    bossEnergy,
    bossEnergyFeedback,
    bossEnergyPercent,
    bossSecondsUntilReady,
    clockNow,
    createBossEnergyStateForNow,
    displayedBossEnergy,
    setBossDetailsOpen,
    setBossEnergy,
    setClockNow
  };
}
