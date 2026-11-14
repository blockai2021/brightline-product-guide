import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { initialState } from "@/features/connect/seed";
import { createProductUnits } from "@/features/connect/domain";
import {
  buildMappingExportCsv,
  emptyMappingFilters,
  initialMappingView,
  mappingPage,
  mappingRows,
  mappingViewReducer,
} from "@/features/connect/transparency-table";

function fixture() {
  let state = initialState();
  const source = state.products[0]?.published;
  if (!source) throw new Error("Missing fixture product");
  const second = {
    ...source,
    id: "second-product",
    name: "Second Model",
    model: "SECOND",
    sku: "SECOND-SKU",
    gtin: "09506000134352",
    brand: "Second Brand",
    slug: "second-product",
  };
  state.products.push({ draft: second, published: { ...second } });
  state.batches.push({
    id: "second-batch",
    productId: second.id,
    batchNumber: "SECOND-BATCH",
    status: "Draft",
  });
  state = createProductUnits(state, {
    productId: second.id,
    batchId: "second-batch",
    serials: Array.from({ length: 35 }, (_, i) => `SECOND${i + 1}`),
  }).state;
  return state;
}
describe("L-007 mapping table rules", () => {
  it("searches case-insensitive SKU and productId without crossing product or batch filters", () => {
    const state = fixture();
    expect(mappingRows(state, { ...emptyMappingFilters, keyword: "second-sku" })).toHaveLength(35);
    expect(mappingRows(state, { ...emptyMappingFilters, keyword: "SECOND-PRODUCT" })).toHaveLength(
      35,
    );
    expect(
      mappingRows(state, {
        ...emptyMappingFilters,
        productId: "second-product",
        batchId: "demo-batch-2026-11",
      }),
    ).toHaveLength(0);
    expect(mappingRows(state, { ...emptyMappingFilters, batchId: "second-batch" })).toHaveLength(
      35,
    );
  });
  it("defaults to twenty rows and pages at 10/20/50/100 with page clamping", () => {
    const rows = mappingRows(fixture(), { ...emptyMappingFilters, productId: "second-product" });
    expect(initialMappingView().pageSize).toBe(20);
    for (const [size, pages, count] of [
      [10, 4, 10],
      [20, 2, 20],
      [50, 1, 35],
      [100, 1, 35],
    ]) {
      const page = mappingPage(rows, 1, size ?? 20);
      expect(page.totalPages).toBe(pages);
      expect(page.rows).toHaveLength(count ?? 0);
    }
    expect(mappingPage(rows.slice(0, 9), 4, 10).page).toBe(1);
  });
  it("keeps three stable selections across pages and clears on filter changes", () => {
    let view = initialMappingView();
    view = mappingViewReducer(view, { type: "select", ids: ["a", "b"], checked: true });
    view = mappingViewReducer(view, { type: "page", page: 2 });
    view = mappingViewReducer(view, { type: "select", ids: ["c"], checked: true });
    expect([...view.selected]).toEqual(["a", "b", "c"]);
    expect(mappingViewReducer(view, { type: "clear" }).selected.size).toBe(0);
    const filtered = mappingViewReducer(view, {
      type: "filter",
      filters: { ...emptyMappingFilters, productId: "second-product" },
    });
    expect(filtered.selected.size).toBe(0);
    expect(filtered.page).toBe(1);
    expect(mappingViewReducer(view, { type: "size", size: 10 }).page).toBe(1);
  });
  it("exports exactly selected rows or all thirty-five filtered rows with real identity fields", () => {
    const state = fixture();
    const rows = mappingRows(state, { ...emptyMappingFilters, productId: "second-product" });
    const selected = [rows[0], rows[1], rows[20]].filter((row) => row !== undefined);
    const parsed = Papa.parse<Record<string, string>>(buildMappingExportCsv(state, selected), {
      header: true,
    }).data;
    expect(parsed).toHaveLength(3);
    expect(parsed[2]).toMatchObject({
      productId: "second-product",
      SKU: "SECOND-SKU",
      batch: "SECOND-BATCH",
      GTIN: "09506000134352",
      serial: "SECOND21",
      unitId: rows[20]?.unit.id,
      absoluteUri: "https://id.product-icode.example/second-brand/01/09506000134352/21/SECOND21",
      officialCodeState: "Not enrolled",
      evidence: "Simulated",
      externalReference: "",
    });
    expect(Papa.parse(buildMappingExportCsv(state, rows), { header: true }).data).toHaveLength(35);
  });
  it("filters the three association modes without mutating evidence or creating official codes", () => {
    const state = fixture();
    const unit = state.units.find((unit) => unit.productId === "second-product");
    if (!unit) throw new Error("Missing unit");
    state.transparency = state.transparency.map((entry) =>
      entry.unitId === unit.id
        ? { ...entry, state: "Amazon-issued code", evidence: "Simulated" }
        : entry,
    );
    const before = JSON.stringify(state);
    const rows = mappingRows(state, { ...emptyMappingFilters, official: "Amazon-issued code" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.association?.evidence).toBe("Simulated");
    buildMappingExportCsv(state, rows);
    expect(JSON.stringify(state)).toBe(before);
  });
  it("exports missing identities honestly and safely quotes formula-like values", () => {
    const state = fixture();
    const row = mappingRows(state, { ...emptyMappingFilters, productId: "second-product" })[0];
    if (!row) throw new Error("Missing row");
    state.identities = state.identities.filter((identity) => identity.unitId !== row.unit.id);
    const entry = state.products.find((entry) => entry.draft.id === "second-product");
    if (!entry) throw new Error("Missing entry");
    entry.draft.name = '=DANGEROUS,"name"';
    const rows = mappingRows(state, { ...emptyMappingFilters, productId: "second-product" }).slice(
      0,
      1,
    );
    const parsed = Papa.parse<Record<string, string>>(buildMappingExportCsv(state, rows), {
      header: true,
    }).data[0];
    expect(parsed?.["absoluteUri"]).toBe("");
    expect(parsed?.["product"]).toBe('\'=DANGEROUS,"name"');
    expect(parsed?.["externalReference"]).toBe("");
  });
});
