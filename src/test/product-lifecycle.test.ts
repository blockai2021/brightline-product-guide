import { describe, expect, it } from "vitest";
import { initialState } from "@/features/connect/seed";
import { archiveProduct, deleteProduct, productDeletionImpact } from "@/features/connect/domain";
import { catalogRows } from "@/features/connect/product-catalog-tools";

describe("product archive and delete", () => {
  const state = initialState();
  const id = state.products.find((p) => p.published)!.draft.id;
  it("archive withdraws the consumer snapshot but keeps units and records", () => {
    const next = archiveProduct(state, id, "2026-11-17T00:00:00Z");
    const entry = next.products.find((p) => p.draft.id === id)!;
    expect(entry.published).toBeUndefined();
    expect(entry.archivedAt).toBe("2026-11-17T00:00:00Z");
    expect(next.units).toEqual(state.units);
    expect(next.records).toEqual(state.records);
    expect(catalogRows(next.products, { query: "", brand: "", status: "Archived" })).toHaveLength(
      1,
    );
  });
  it("delete removes the product and everything linked to it", () => {
    expect(productDeletionImpact(state, id).units).toBeGreaterThan(0);
    const next = deleteProduct(state, id);
    expect(next.products.some((p) => p.draft.id === id)).toBe(false);
    expect(next.units.some((u) => u.productId === id)).toBe(false);
    expect(next.batches.some((b) => b.productId === id)).toBe(false);
    expect(next.records.some((r) => r.productId === id)).toBe(false);
    const units = new Set(next.units.map((u) => u.id));
    expect(next.identities.every((i) => units.has(i.unitId))).toBe(true);
    expect(next.transparency.every((t) => units.has(t.unitId))).toBe(true);
  });
});
