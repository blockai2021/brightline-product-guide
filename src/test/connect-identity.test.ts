import { describe, expect, it } from "vitest";
import {
  buildDigitalLinkPath,
  createProductUnits,
  encodeGs1PathSegment,
  findUnitByIdentity,
  isValidAi21Serial,
  normalizeGtin14,
  saveDraft,
} from "@/features/connect/domain";
import { demoProduct, initialState } from "@/features/connect/seed";
import { migrateLegacyState } from "@/features/connect/store";

describe("GS1 demo identity rules", () => {
  it("validates the GTIN check digit without treating demo prefixes as GTINs", () => {
    expect(normalizeGtin14("04012345678901")).toBe("04012345678901");
    expect(normalizeGtin14("DEMO-04012345678901")).toBeNull();
    expect(normalizeGtin14("04012345678902")).toBeNull();
  });

  it("enforces the AI (21) length and encodable character boundary", () => {
    expect(isValidAi21Serial("A1/b+2")).toBe(true);
    expect(isValidAi21Serial("A".repeat(20))).toBe(true);
    expect(isValidAi21Serial("A".repeat(21))).toBe(false);
    expect(isValidAi21Serial("序列号")).toBe(false);
  });

  it("strictly percent-encodes serial path delimiters", () => {
    expect(encodeGs1PathSegment("A/1+!")).toBe("A%2F1%2B%21");
    expect(buildDigitalLinkPath("04012345678901", "A/1+!")).toBe(
      "/01/04012345678901/21/A%2F1%2B%21",
    );
  });

  it("resolves a unit from the compound GTIN and serial identity", () => {
    const state = initialState();
    expect(findUnitByIdentity(state, "04012345678901", "NH26000128")?.id).toBe("demo-unit-000128");
    expect(findUnitByIdentity(state, "04012345678901", "UNKNOWN")).toBeUndefined();
  });

  it("creates units for the explicitly selected product and batch", () => {
    const state = initialState();
    const product = {
      ...structuredClone(demoProduct),
      id: "demo-product-two",
      name: "Second model",
      gtin: "09506000134352",
    };
    const withSecondModel = {
      ...state,
      products: [...state.products, { draft: product }],
      batches: [
        ...state.batches,
        {
          id: "batch-two",
          productId: product.id,
          batchNumber: "BATCH-2",
          status: "Active" as const,
        },
      ],
    };
    const result = createProductUnits(
      withSecondModel,
      { productId: product.id, batchId: "batch-two", serials: ["SERIAL-2"] },
      { createId: () => "fixed", now: () => "2026-11-14T00:00:00Z" },
    );
    expect(result.created[0]).toMatchObject({
      productId: product.id,
      batchId: "batch-two",
      serial: "SERIAL-2",
    });
    expect(result.state.identities[0]).toMatchObject({
      gtin: "09506000134352",
      serial: "SERIAL-2",
    });
  });

  it("reports invalid, input-duplicate and existing GTIN + serial values", () => {
    const state = initialState();
    const result = createProductUnits(
      state,
      {
        productId: demoProduct.id,
        batchId: "demo-batch-2026-11",
        serials: ["NEW-SERIAL", "NEW-SERIAL", "序列号", "NH26000128"],
      },
      { createId: () => "fixed", now: () => "2026-11-14T00:00:00Z" },
    );
    expect(result.created.map((unit) => unit.serial)).toEqual(["NEW-SERIAL"]);
    expect(result.rejected.map((item) => item.reason)).toEqual([
      "Duplicate in input",
      "Invalid AI (21) serial",
      "Duplicate GTIN + serial",
    ]);
  });

  it("rejects a batch belonging to another product", () => {
    const state = initialState();
    expect(() =>
      createProductUnits(
        {
          ...state,
          batches: state.batches.map((batch) => ({ ...batch, productId: "another-product" })),
        },
        {
          productId: demoProduct.id,
          batchId: "demo-batch-2026-11",
          serials: ["SERIAL-2"],
        },
      ),
    ).toThrow("BATCH_PRODUCT_MISMATCH");
  });

  it("locks a model GTIN after identities have been issued", () => {
    expect(() => saveDraft(initialState(), { ...demoProduct, gtin: "09506000134352" })).toThrow(
      "ISSUED_GTIN_IMMUTABLE",
    );
  });
});

describe("local demo migration", () => {
  it("keeps a v2 state idempotent", () => {
    const state = initialState();
    expect(migrateLegacyState(state)).toBe(state);
  });

  it("rejects malformed legacy state", () => {
    expect(migrateLegacyState({ products: [] })).toBeNull();
  });

  it("migrates legacy warranty records to the matching unit without data loss", () => {
    const legacyProduct = {
      ...structuredClone(demoProduct),
      gtin: "DEMO-04012345678901",
      serial: "LEGACY-SERIAL",
    };
    const legacy = {
      products: [{ draft: legacyProduct, published: legacyProduct }],
      records: [
        {
          id: "legacy-warranty",
          productId: legacyProduct.id,
          name: "Demo",
          email: "demo@example.test",
          serial: "LEGACY-SERIAL",
          date: "2026-11-14",
          kind: "Warranty",
          details: "Legacy record",
          status: "New",
        },
      ],
      campaigns: [],
      consents: [],
      visits: 1,
    };
    const migrated = migrateLegacyState(legacy);
    const record = migrated?.records[0];
    expect(record?.unitId).toBeDefined();
    expect(migrated?.units.find((unit) => unit.id === record?.unitId)).toMatchObject({
      productId: legacyProduct.id,
      serial: "LEGACY-SERIAL",
    });
    expect(record?.details).toBe("Legacy record");
  });
});
