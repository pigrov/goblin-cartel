import { describe, expect, it } from "vitest";
import { createOfflineMiningSummary, formatOfflineDuration } from "./offlineMiningSummary";

describe("offline mining summary", () => {
  it("returns no report when offline mining did not change anything", () => {
    expect(
      createOfflineMiningSummary({
        destroyedBlocks: 0,
        pendingFinalHit: false,
        relocationMoves: 0,
        rewards: {},
        seconds: 120
      })
    ).toBeNull();
  });

  it("keeps foreman relocations even when no block was destroyed", () => {
    expect(
      createOfflineMiningSummary({
        destroyedBlocks: 0,
        pendingFinalHit: false,
        relocationMoves: 3,
        rewards: { gold: 0, stone: 12.9 },
        seconds: 3700.8
      })
    ).toEqual({
      destroyedBlocks: 0,
      pendingFinalHit: false,
      relocationMoves: 3,
      rewards: { stone: 12 },
      seconds: 3700
    });
  });

  it("formats compact offline durations", () => {
    expect(formatOfflineDuration(47)).toBe("47с");
    expect(formatOfflineDuration(125)).toBe("2м 5с");
    expect(formatOfflineDuration(7260)).toBe("2ч 1м");
  });
});
