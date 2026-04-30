import { useCallback, useEffect, useRef, useState } from "react";

type ResourceAmounts = Record<string, number>;
type StateValue<T> = T | ((current: T) => T);
type StateSetter<T> = (value: StateValue<T>) => void;
type TimerId = unknown;
type TimerScheduler = (handler: () => void, delayMs: number) => TimerId;
type TimerClearer = (timerId: TimerId) => void;

export interface DelayedResourceDisplayController {
  dispose: () => void;
  scheduleReward: (rewards: ResourceAmounts) => void;
  sync: (resources: ResourceAmounts) => void;
  updateOptions: (options: DelayedResourceDisplayTiming) => void;
}

export interface DelayedResourceDisplayTiming {
  flashMs: number;
  rewardSettleDelayMs: number;
}

interface DelayedResourceDisplayControllerOptions extends DelayedResourceDisplayTiming {
  clearTimeoutFn?: TimerClearer;
  setFlashingResourceIds: StateSetter<ReadonlySet<string>>;
  setTimeoutFn?: TimerScheduler;
  setVisibleResourceAmounts: StateSetter<ResourceAmounts>;
}

export function createDelayedResourceDisplayController(
  options: DelayedResourceDisplayControllerOptions
): DelayedResourceDisplayController {
  let flashMs = options.flashMs;
  let rewardSettleDelayMs = options.rewardSettleDelayMs;
  let generation = 0;
  let timers: TimerId[] = [];
  const setTimeoutFn = options.setTimeoutFn ?? ((handler, delayMs) => window.setTimeout(handler, delayMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((timerId) => window.clearTimeout(timerId as number));

  function removeTimer(timerId: TimerId) {
    timers = timers.filter((item) => item !== timerId);
  }

  function clearTimers() {
    for (const timerId of timers) {
      clearTimeoutFn(timerId);
    }

    timers = [];
  }

  function flashRewardResourceChips(resourceIds: string[]) {
    const uniqueResourceIds = Array.from(new Set(resourceIds));

    options.setFlashingResourceIds((current) => {
      const next = new Set(current);

      for (const resourceId of uniqueResourceIds) {
        next.delete(resourceId);
      }

      return next;
    });

    const startTimerId = setTimeoutFn(() => {
      removeTimer(startTimerId);
      options.setFlashingResourceIds((current) => {
        const next = new Set(current);

        for (const resourceId of uniqueResourceIds) {
          next.add(resourceId);
        }

        return next;
      });

      const endTimerId = setTimeoutFn(() => {
        removeTimer(endTimerId);
        options.setFlashingResourceIds((current) => {
          const next = new Set(current);

          for (const resourceId of uniqueResourceIds) {
            next.delete(resourceId);
          }

          return next;
        });
      }, flashMs);

      timers.push(endTimerId);
    }, 0);

    timers.push(startTimerId);
  }

  return {
    dispose: clearTimers,
    scheduleReward: (rewards) => {
      const rewardEntries = Object.entries(rewards).filter(([, amount]) => amount > 0);

      if (rewardEntries.length === 0) {
        return;
      }

      const positiveRewards = Object.fromEntries(rewardEntries);
      const scheduledGeneration = generation;
      const settleTimerId = setTimeoutFn(() => {
        removeTimer(settleTimerId);

        if (generation !== scheduledGeneration) {
          return;
        }

        options.setVisibleResourceAmounts((current) => mergeResourceAmounts(current, positiveRewards));
        flashRewardResourceChips(rewardEntries.map(([resourceId]) => resourceId));
      }, rewardSettleDelayMs);

      timers.push(settleTimerId);
    },
    sync: (resources) => {
      generation += 1;
      clearTimers();
      options.setVisibleResourceAmounts({ ...resources });
      options.setFlashingResourceIds(new Set());
    },
    updateOptions: (nextOptions) => {
      flashMs = nextOptions.flashMs;
      rewardSettleDelayMs = nextOptions.rewardSettleDelayMs;
    }
  };
}

export function useDelayedResourceDisplay(options: {
  initialResources: ResourceAmounts;
} & DelayedResourceDisplayTiming) {
  const [visibleResourceAmounts, setVisibleResourceAmounts] = useState<ResourceAmounts>(() => ({ ...options.initialResources }));
  const [flashingResourceIds, setFlashingResourceIds] = useState<ReadonlySet<string>>(() => new Set());
  const controllerRef = useRef<DelayedResourceDisplayController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createDelayedResourceDisplayController({
      flashMs: options.flashMs,
      rewardSettleDelayMs: options.rewardSettleDelayMs,
      setFlashingResourceIds,
      setVisibleResourceAmounts
    });
  }

  useEffect(() => {
    controllerRef.current?.updateOptions({
      flashMs: options.flashMs,
      rewardSettleDelayMs: options.rewardSettleDelayMs
    });
  }, [options.flashMs, options.rewardSettleDelayMs]);

  useEffect(() => {
    return () => controllerRef.current?.dispose();
  }, []);

  const scheduleResourceRewardDisplay = useCallback((rewards: ResourceAmounts) => {
    controllerRef.current?.scheduleReward(rewards);
  }, []);

  const syncVisibleResourceAmounts = useCallback((resources: ResourceAmounts) => {
    controllerRef.current?.sync(resources);
  }, []);

  return {
    flashingResourceIds,
    scheduleResourceRewardDisplay,
    syncVisibleResourceAmounts,
    visibleResourceAmounts
  };
}

function mergeResourceAmounts(left: ResourceAmounts, right: ResourceAmounts): ResourceAmounts {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}
