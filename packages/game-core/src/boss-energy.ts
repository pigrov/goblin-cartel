export interface BossEnergyConfig {
  maxEnergy: number;
  energyPerHit: number;
  regenPerSecond: number;
  damagePerTap: number;
  critChance: number;
  critMultiplier: number;
}

export interface BossEnergyState {
  currentEnergy: number;
  updatedAt: number;
}

export interface BossAttackInput {
  now: number;
  random?: () => number;
}

export interface BossAttackSuccess {
  ok: true;
  state: BossEnergyState;
  damage: number;
  critical: boolean;
  energySpent: number;
}

export interface BossAttackFailure {
  ok: false;
  state: BossEnergyState;
  energyMissing: number;
  secondsUntilReady: number;
}

export type BossAttackResult = BossAttackSuccess | BossAttackFailure;

export function createBossEnergyState(config: BossEnergyConfig, now: number): BossEnergyState {
  return {
    currentEnergy: normalizeEnergy(config.maxEnergy, config),
    updatedAt: normalizeTimestamp(now)
  };
}

export function restoreBossEnergyState(
  state: BossEnergyState | undefined,
  config: BossEnergyConfig,
  now: number
): BossEnergyState {
  if (!state) {
    return createBossEnergyState(config, now);
  }

  return regenerateBossEnergy(
    {
      currentEnergy: normalizeEnergy(state.currentEnergy, config),
      updatedAt: normalizeTimestamp(state.updatedAt)
    },
    config,
    now
  );
}

export function regenerateBossEnergy(state: BossEnergyState, config: BossEnergyConfig, now: number): BossEnergyState {
  const normalizedNow = normalizeTimestamp(now);
  const updatedAt = normalizeTimestamp(state.updatedAt);
  const elapsedSeconds = Math.max(0, (normalizedNow - updatedAt) / 1000);
  const regeneratedEnergy = normalizeEnergy(
    state.currentEnergy + elapsedSeconds * Math.max(0, config.regenPerSecond),
    config
  );

  return {
    currentEnergy: regeneratedEnergy,
    updatedAt: normalizedNow
  };
}

export function applyBossAttack(
  state: BossEnergyState,
  config: BossEnergyConfig,
  input: BossAttackInput
): BossAttackResult {
  const now = normalizeTimestamp(input.now);
  const regeneratedState = regenerateBossEnergy(state, config, now);
  const energyPerHit = Math.max(0, config.energyPerHit);

  if (regeneratedState.currentEnergy < energyPerHit) {
    const energyMissing = energyPerHit - regeneratedState.currentEnergy;
    const secondsUntilReady =
      config.regenPerSecond > 0 ? energyMissing / config.regenPerSecond : Number.POSITIVE_INFINITY;

    return {
      ok: false,
      state: regeneratedState,
      energyMissing,
      secondsUntilReady
    };
  }

  const random = input.random ?? Math.random;
  const critical = random() < clamp(config.critChance, 0, 1);
  const damage = Math.max(0, Math.round(config.damagePerTap * (critical ? Math.max(1, config.critMultiplier) : 1)));

  return {
    ok: true,
    state: {
      currentEnergy: normalizeEnergy(regeneratedState.currentEnergy - energyPerHit, config),
      updatedAt: now
    },
    damage,
    critical,
    energySpent: energyPerHit
  };
}

export function getBossEnergySecondsUntilReady(state: BossEnergyState, config: BossEnergyConfig, now: number): number {
  const regeneratedState = regenerateBossEnergy(state, config, now);

  if (regeneratedState.currentEnergy >= config.energyPerHit) {
    return 0;
  }

  if (config.regenPerSecond <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (config.energyPerHit - regeneratedState.currentEnergy) / config.regenPerSecond;
}

function normalizeEnergy(value: number, config: BossEnergyConfig): number {
  return clamp(Number.isFinite(value) ? value : config.maxEnergy, 0, Math.max(0, config.maxEnergy));
}

function normalizeTimestamp(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
