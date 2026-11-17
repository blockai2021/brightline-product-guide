import { describe, expect, it } from "vitest";
import { emptyAfterSalesFilters as e, filterAfterSalesRecords } from "@/features/connect/after-sales-filter";
import type { RecordEntry } from "@/features/connect/domain";

const r = (o: Partial<RecordEntry>): RecordEntry => ({
  id: "r", productId: "p1", name: "A", email: "a@x", serial: "S", date: "2026-11-10",
  kind: "Support", details: "", status: "New", ...o,
});
const state = {
  units: [{ id: "u1", batchId: "b1" }, { id: "u2", batchId: "b2" }] as never,
  records: [
    r({ id: "1", unitId: "u1", kind: "Warranty", date: "2026-11-01" }),
    r({ id: "2", unitId: "u2", productId: "p2", status: "Resolved", date: "2026-11-20" }),
    r({ id: "3", kind: "Event" }),
  ],
};
const ids = (f: Partial<typeof e>) => filterAfterSalesRecords(state, { ...e, ...f }).map((x) => x.id);
describe("after-sales filters", () => {
  it("never lists event sign-ups", () => expect(ids({})).toEqual(["1", "2"]));
  it("filters by type", () => expect(ids({ kind: "Warranty" })).toEqual(["1"]));
  it("filters by product", () => expect(ids({ productId: "p2" })).toEqual(["2"]));
  it("filters by batch via the unit", () => expect(ids({ batchId: "b1" })).toEqual(["1"]));
  it("filters by status", () => expect(ids({ status: "Resolved" })).toEqual(["2"]));
  it("date range is inclusive", () => expect(ids({ from: "2026-11-01", to: "2026-11-19" })).toEqual(["1"]));
});
