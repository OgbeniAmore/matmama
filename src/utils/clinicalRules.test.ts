import { describe, it, expect } from "vitest";
import { calculateEddFromScan, nextTtEligibleDate, iptpEligibility } from "./ancUtils";
import { computeCatchUpShifts } from "./immunizationUtils";

describe("clinical rules", () => {
  it("scan at 14w0d gives EDD 182 days later", () => {
    const edd = calculateEddFromScan(new Date("2026-01-01"), 14, 0);
    expect(edd.toISOString().slice(0, 10)).toBe("2026-07-02");
  });
  it("TT2 is due 4 weeks after TT1", () => {
    expect(nextTtEligibleDate([{ dose_number: 1, given_on: "2026-01-01" }])!.toISOString().slice(0, 10)).toBe("2026-01-29");
  });
  it("TT complete after 5 doses", () => {
    expect(nextTtEligibleDate([{ dose_number: 5, given_on: "2026-01-01" }])).toBeNull();
  });
  it("IPTp not before 13 weeks", () => {
    expect(iptpEligibility(12, []).eligible).toBe(false);
  });
  it("IPTp needs 4 weeks between doses", () => {
    expect(iptpEligibility(20, [{ given_on: "2026-01-01" }], new Date("2026-01-20")).eligible).toBe(false);
    expect(iptpEligibility(20, [{ given_on: "2026-01-01" }], new Date("2026-01-29")).eligible).toBe(true);
  });
  it("late Penta 1 pushes Penta 2 and 3 to 4-week gaps", () => {
    const recs = [
      { id: "a", vaccine_name: "Pentavalent 1", due_date: "2026-01-01", status: "Missed" },
      { id: "b", vaccine_name: "Pentavalent 2", due_date: "2026-01-29", status: "Pending" },
      { id: "c", vaccine_name: "Pentavalent 3", due_date: "2026-02-26", status: "Pending" },
      { id: "d", vaccine_name: "OPV 2", due_date: "2026-01-29", status: "Pending" },
    ];
    expect(computeCatchUpShifts(recs, "a", new Date("2026-03-01"))).toEqual([
      { id: "b", due_date: "2026-03-29" },
      { id: "c", due_date: "2026-04-26" },
    ]);
  });
});
