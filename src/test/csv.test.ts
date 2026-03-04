import { describe, it, expect } from "vitest";
import { parseCSV, normalizeHeaders } from "@/lib/csv";

// ── parseCSV ──────────────────────────────────────────────────

describe("parseCSV", () => {
  it("parses a simple CSV with headers", () => {
    const csv = `Name,Power,Deaths
Alice,50000,100
Bob,30000,200`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alice", power: "50000", deaths: "100" });
    expect(rows[1]).toEqual({ name: "Bob", power: "30000", deaths: "200" });
  });

  it("lowercases and underscores headers", () => {
    const csv = `City Hall Level,Rss Gathered
25,900000`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty("city_hall_level", "25");
    expect(rows[0]).toHaveProperty("rss_gathered", "900000");
  });

  it("returns empty for header-only CSV", () => {
    expect(parseCSV("Name,Power")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("skips blank lines", () => {
    const csv = `Name,Power
Alice,50000

Bob,30000
`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
  });

  it("parses the real ROK CSV format", () => {
    const csv = `ID,Name,Alliance,Power,T1 Kills,T2 Kills,T3 Kills,T4 Kills,T5 Kills,Total Kills,T45 Kills,Killpoints,Deads,Ranged,Rss Gathered,Rss Assistance,Helps,City Hall Level
12345,TestGov,ABC,5000000,100,200,300,400,500,1500,900,12000,50,10,9000000,500000,1200,25`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("12345");
    expect(rows[0].name).toBe("TestGov");
    expect(rows[0].alliance).toBe("ABC");
    expect(rows[0].t4_kills).toBe("400");
    expect(rows[0].deads).toBe("50");
    expect(rows[0].city_hall_level).toBe("25");
  });
});

// ── normalizeHeaders ──────────────────────────────────────────

describe("normalizeHeaders", () => {
  it("maps 'id' to 'governor_id'", () => {
    const rows = [{ id: "123", name: "Alice" }];
    const normalized = normalizeHeaders(rows);
    expect(normalized[0].governor_id).toBe("123");
    expect(normalized[0].governor_name).toBe("Alice");
  });

  it("maps 'deads' to 'deaths'", () => {
    const rows = [{ deads: "50" }];
    expect(normalizeHeaders(rows)[0].deaths).toBe("50");
  });

  it("maps 'rss_gathered' to 'resource_gathered'", () => {
    const rows = [{ rss_gathered: "9000000" }];
    expect(normalizeHeaders(rows)[0].resource_gathered).toBe("9000000");
  });

  it("passes through already-correct column names", () => {
    const rows = [{ governor_name: "Bob", power: "5000", killpoints: "999" }];
    const n = normalizeHeaders(rows)[0];
    expect(n.governor_name).toBe("Bob");
    expect(n.power).toBe("5000");
    expect(n.killpoints).toBe("999");
  });

  it("maps kvk variations", () => {
    const rows = [{ kvk_kill: "100", kvk_death: "50" }];
    const n = normalizeHeaders(rows)[0];
    expect(n.kvk_kills).toBe("100");
    expect(n.kvk_deaths).toBe("50");
  });

  it("handles the full ROK CSV header set", () => {
    const row = {
      id: "1", name: "Gov", alliance: "A", power: "5M",
      t1_kills: "1", t2_kills: "2", t3_kills: "3", t4_kills: "4", t5_kills: "5",
      total_kills: "15", t45_kills: "9", killpoints: "99",
      deads: "10", ranged: "7", rss_gathered: "8M", rss_assistance: "5M",
      helps: "100", city_hall_level: "25",
    };
    const n = normalizeHeaders([row])[0];
    expect(n.governor_id).toBe("1");
    expect(n.governor_name).toBe("Gov");
    expect(n.deaths).toBe("10");
    expect(n.resource_gathered).toBe("8M");
  });
});
