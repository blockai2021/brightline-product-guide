import type { DemoState, RecordEntry } from "./domain";

export type AfterSalesFilters = {
  kind: string; // "" | Warranty | Support
  productId: string;
  batchId: string;
  status: string;
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  query: string;
};
export const emptyAfterSalesFilters: AfterSalesFilters = {
  kind: "",
  productId: "",
  batchId: "",
  status: "",
  from: "",
  to: "",
  query: "",
};

/** Batch is derived from the record's unit; model-level records have no batch. */
export function recordBatchId(state: Pick<DemoState, "units">, record: RecordEntry) {
  return record.unitId ? state.units.find((u) => u.id === record.unitId)?.batchId : undefined;
}

export function filterAfterSalesRecords(
  state: Pick<DemoState, "records" | "units">,
  f: AfterSalesFilters,
) {
  const q = f.query.trim().toLowerCase();
  return state.records.filter((r) => {
    if (r.kind === "Event") return false;
    if (f.kind && r.kind !== f.kind) return false;
    if (f.productId && r.productId !== f.productId) return false;
    if (f.batchId && recordBatchId(state, r) !== f.batchId) return false;
    if (f.status && r.status !== f.status) return false;
    const day = r.date.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return !q || `${r.name} ${r.email} ${r.id} ${r.serial}`.toLowerCase().includes(q);
  });
}
