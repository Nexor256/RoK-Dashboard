import { describe, it, expect } from "vitest";
import { fmt } from "@/lib/utils";
import { calcDKP } from "@/hooks/useGovernorData";

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
      calcDKP({ t4_kills: 100, t5_kills: 50, deaths: 200, killpoints: 9999 })
    ).toBe(9999);
  });

  it("computes from t4/t5/deaths when killpoints is null (default weights 5/10/40)", () => {
    // 100*5 + 50*10 + 200*40 = 500 + 500 + 8000 = 9000
    expect(
      calcDKP({ t4_kills: 100, t5_kills: 50, deaths: 200, killpoints: null })
    ).toBe(9000);
  });

  it("computes from t4/t5/deaths when killpoints is 0", () => {
    // killpoints === 0 is falsy, so it falls back
    // 10*5 + 5*10 + 0*40 = 50 + 50 + 0 = 100
    expect(
      calcDKP({ t4_kills: 10, t5_kills: 5, deaths: 0, killpoints: 0 })
    ).toBe(100);
  });

  it("handles all nulls", () => {
    expect(
      calcDKP({ t4_kills: null, t5_kills: null, deaths: null, killpoints: null })
    ).toBe(0);
  });
});

// ── calcDKP with custom weights ───────────────────────────────

describe("calcDKP with custom weights", () => {
  it("uses custom weights when killpoints is null", () => {
    // 100*2 + 50*5 + 200*8 = 200 + 250 + 1600 = 2050
    expect(
      calcDKP(
        { t4_kills: 100, t5_kills: 50, deaths: 200, killpoints: null },
        { t4_kills: 2, t5_kills: 5, deaths: 8 }
      )
    ).toBe(2050);
  });

  it("still returns killpoints when available regardless of weights", () => {
    expect(
      calcDKP(
        { t4_kills: 100, t5_kills: 50, deaths: 200, killpoints: 9999 },
        { t4_kills: 2, t5_kills: 5, deaths: 8 }
      )
    ).toBe(9999);
  });
});
