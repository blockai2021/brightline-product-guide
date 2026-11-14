import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { initialState } from "@/features/connect/seed";
import {
  catalogRows,
  catalogExportCsv,
  importLimitError,
  suggestProductMapping,
  validateProductMapping,
  PRODUCT_IMPORT_MAX_BYTES,
  catalogPageSizes,
} from "@/features/connect/product-catalog-tools";
import { parseProductCsv } from "@/features/connect/product-import";

describe("Product catalog presentation", () => {
  it("enforces the transparent 1,000-row demo limit", () => {
    expect(importLimitError(0, 1000)).toBeUndefined();
    expect(importLimitError(0, 1001)).toBe("Import.rowLimit");
  });
  it("enforces the 5 MiB upload limit", () => {
    expect(PRODUCT_IMPORT_MAX_BYTES).toBe(5242880);
    expect(importLimitError(5242880)).toBeUndefined();
    expect(importLimitError(5242881)).toBe("Import.fileLimit");
  });
  it("supports the requested 10/20/50/100 page sizes", () => {
    expect(catalogPageSizes).toEqual([10, 20, 50, 100]);
  });
  it("suggests only declared multilingual aliases and never guesses fuzzy names", () => {
    expect(suggestProductMapping(["货号", "Marke", "product_name", "SKU-ish"])).toEqual({
      货号: "sku",
      Marke: "brand",
      product_name: "name",
    });
  });
  it("requires SKU/brand mapping and rejects repeated target fields", () => {
    const table = parseProductCsv("sku,brand,other\nA,B,C");
    expect(validateProductMapping(table, { sku: "sku" })).toBe(false);
    expect(validateProductMapping(table, { sku: "sku", brand: "brand", other: "sku" })).toBe(false);
    expect(validateProductMapping(table, { sku: "sku", brand: "brand" })).toBe(true);
  });
  it("searches all five requested fields and combines brand/publication filters", () => {
    const state = initialState();
    const entry = state.products[0];
    if (!entry) throw new Error("Missing seeded product");
    for (const query of [
      entry.draft.name,
      entry.draft.sku,
      entry.draft.gtin,
      entry.draft.model,
      entry.draft.brand,
    ]) {
      expect(catalogRows(state.products, { query, brand: "", status: "" })).toContain(entry);
    }
    expect(catalogRows(state.products, { query: "", brand: "Other", status: "" })).toHaveLength(0);
    expect(catalogRows([entry], { query: "", brand: "", status: "Draft" })).toHaveLength(0);
    expect(
      catalogRows([{ draft: entry.draft }], { query: "", brand: "", status: "Draft" }),
    ).toHaveLength(1);
  });
  it("exports draft content with safe formula escaping and quoted line breaks", () => {
    const entry = initialState().products[0];
    if (!entry) throw new Error("Missing seeded product");
    const csv = catalogExportCsv([
      { ...entry, draft: { ...entry.draft, name: "=CMD()", specs: 'a,"b"\nc' } },
    ]);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true }).data[0];
    expect(parsed?.["name"]).toBe("'=CMD()");
    expect(parsed?.["specs"]).toBe('a,"b"\nc');
    expect(parsed?.["publicationStatus"]).toBe("Published");
  });
});
