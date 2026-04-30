import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDelayedResourceDisplayController } from "./useDelayedResourceDisplay";

describe("delayed resource display controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds rewards only after the settle delay and flashes rewarded chips", () => {
    const state = createTestState({
      visibleResourceAmounts: {
        stone: 10
      }
    });
    const controller = createDelayedResourceDisplayController({
      flashMs: 60,
      rewardSettleDelayMs: 100,
      setFlashingResourceIds: state.setFlashingResourceIds,
      setTimeoutFn: (handler, delayMs) => setTimeout(handler, delayMs),
      setVisibleResourceAmounts: state.setVisibleResourceAmounts,
      clearTimeoutFn: (timerId) => clearTimeout(timerId as ReturnType<typeof setTimeout>)
    });

    controller.scheduleReward({
      copper: 1,
      stone: 3
    });

    vi.advanceTimersByTime(99);

    expect(state.visibleResourceAmounts).toEqual({
      stone: 10
    });
    expect([...state.flashingResourceIds]).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(state.visibleResourceAmounts).toEqual({
      copper: 1,
      stone: 13
    });
    expect([...state.flashingResourceIds]).toEqual([]);

    vi.advanceTimersByTime(1);

    expect([...state.flashingResourceIds].sort()).toEqual(["copper", "stone"]);

    vi.advanceTimersByTime(60);

    expect([...state.flashingResourceIds]).toEqual([]);
  });

  it("cancels pending reward display when visible resources are synced", () => {
    const state = createTestState({
      visibleResourceAmounts: {
        stone: 10
      }
    });
    const controller = createDelayedResourceDisplayController({
      flashMs: 60,
      rewardSettleDelayMs: 100,
      setFlashingResourceIds: state.setFlashingResourceIds,
      setTimeoutFn: (handler, delayMs) => setTimeout(handler, delayMs),
      setVisibleResourceAmounts: state.setVisibleResourceAmounts,
      clearTimeoutFn: (timerId) => clearTimeout(timerId as ReturnType<typeof setTimeout>)
    });

    controller.scheduleReward({
      stone: 5
    });

    vi.advanceTimersByTime(50);
    controller.sync({
      stone: 2
    });
    vi.advanceTimersByTime(1000);

    expect(state.visibleResourceAmounts).toEqual({
      stone: 2
    });
    expect([...state.flashingResourceIds]).toEqual([]);
  });

  it("ignores empty and non-positive rewards", () => {
    const state = createTestState({
      visibleResourceAmounts: {
        stone: 10
      }
    });
    const controller = createDelayedResourceDisplayController({
      flashMs: 60,
      rewardSettleDelayMs: 100,
      setFlashingResourceIds: state.setFlashingResourceIds,
      setTimeoutFn: (handler, delayMs) => setTimeout(handler, delayMs),
      setVisibleResourceAmounts: state.setVisibleResourceAmounts,
      clearTimeoutFn: (timerId) => clearTimeout(timerId as ReturnType<typeof setTimeout>)
    });

    controller.scheduleReward({
      copper: 0,
      stone: -2
    });
    vi.advanceTimersByTime(1000);

    expect(state.visibleResourceAmounts).toEqual({
      stone: 10
    });
    expect([...state.flashingResourceIds]).toEqual([]);
  });
});

function createTestState(initial: {
  visibleResourceAmounts: Record<string, number>;
}) {
  let visibleResourceAmounts = initial.visibleResourceAmounts;
  let flashingResourceIds: ReadonlySet<string> = new Set();

  return {
    get flashingResourceIds() {
      return flashingResourceIds;
    },
    setFlashingResourceIds: (value: ReadonlySet<string> | ((current: ReadonlySet<string>) => ReadonlySet<string>)) => {
      flashingResourceIds = typeof value === "function" ? value(flashingResourceIds) : value;
    },
    setVisibleResourceAmounts: (
      value: Record<string, number> | ((current: Record<string, number>) => Record<string, number>)
    ) => {
      visibleResourceAmounts = typeof value === "function" ? value(visibleResourceAmounts) : value;
    },
    get visibleResourceAmounts() {
      return visibleResourceAmounts;
    }
  };
}
