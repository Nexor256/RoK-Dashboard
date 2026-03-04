import { describe, it, expect } from "vitest";
import { fmt } from "@/lib/utils";
import { calcDKP, calcKvKPoints } from "@/hooks/useGovernorData";

// ── fmt() ─────────────────────────────────────────────────────

describe("fmt", () => {
  it("formats numbers below 1000 as-is", () => {
    expect(fmt(0)).toBe("0");
    expect(fmt(999)).toBe("999");
    expect(fmt(42)).toBe("42");
  });

  it("formats thousands as K", () => {
    expect(fmt(1000)).toBe("1.0K");
    expect(fmt(1500)).toBe("1.5K");
    expect(fmt(999_999)).toBe("1000.0K");
  });

  it("formats millions as M", () => {
    expect(fmt(1_000_000)).toBe("1.0M");
    expect(fmt(2_500_000)).toBe("2.5M");
  });

  it("formats billions as B", () => {
    expect(fmt(1_000_000_000)).toBe("1.0B");
    expect(fmt(3_700_000_000)).toBe("3.7B");
  });
});

// ── calcDKP() ─────────────────────────────────────────────────

describe("calcDKP", () => {
  it("returns killpoints when available", () => {
    expect(
      calcDKP({ t4_kills: 100, t5_kills: 50, dead_troops: 200, killpoints: 9999 })
    ).toBe(9999);
  });

  it("computes from t4/t5/dead when killpoints is null", () => {
    // 100*4 + 50*10 + 200*15 = 400 + 500 + 3000 = 3900
    expect(
      calcDKP({ t4_kills: 100, t5_kills: 50, dead_troops: 200, killpoints: null })
    ).toBe(3900);
  });

  it("computes from t4/t5/dead when killpoints is 0", () => {
    // killpoints === 0 is falsy, so it falls back
    expect(
      calcDKP({ t4_kills: 10, t5_kills: 5, dead_troops: 0, killpoints: 0 })
    ).toBe(90); // 40 + 50 + 0
  });

  it("handles all nulls", () => {
    expect(
      calcDKP({ t4_kills: null, t5_kills: null, dead_troops: null, killpoints: null })
    ).toBe(0);
  });
});

// ── calcKvKPoints() ───────────────────────────────────────────

describe("calcKvKPoints", () => {
  it("computes kills + deaths*2", () => {
    expect(calcKvKPoints({ kvk_kills: 1000, kvk_deaths: 500 })).toBe(2000);
  });

  it("handles nulls", () => {
    expect(calcKvKPoints({ kvk_kills: null, kvk_deaths: null })).toBe(0);
  });
});
