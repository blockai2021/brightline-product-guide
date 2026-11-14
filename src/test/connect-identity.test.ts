import { describe, expect, it } from "vitest";
import {
  buildBrandedDigitalLinkUri,
  buildDigitalLinkPath,
  buildUnitExportCsv,
  createProductUnits,
  DEMO_DIGITAL_LINK_BASE_URL,
  encodeGs1PathSegment,
  findUnitByIdentity,
  generateSerialCandidates,
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

  it("builds branded unit and model HTTPS URIs without changing the legacy identity path", () => {
    expect(
      buildBrandedDigitalLinkUri({
        baseUrl: `${DEMO_DIGITAL_LINK_BASE_URL}/`,
        brandSlug: "brand-a",
        gtin: "04012345678901",
        serial: "APM26000001",
      }),
    ).toBe("https://id.product-icode.example/brand-a/01/04012345678901/21/APM26000001");
    expect(
      buildBrandedDigitalLinkUri({
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug: "brand-a",
        gtin: "04012345678901",
      }),
    ).toBe("https://id.product-icode.example/brand-a/01/04012345678901");
    expect(buildDigitalLinkPath("04012345678901", "APM26000001")).toBe(
      "/01/04012345678901/21/APM26000001",
    );
  });

  it("keeps brands separate, encodes serials and rejects unsafe URI inputs", () => {
    const branded = (brandSlug: string) =>
      buildBrandedDigitalLinkUri({
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug,
        gtin: "04012345678901",
        serial: "A/1+!",
      });
    expect(branded("brand-a")).toContain("/brand-a/01/");
    expect(branded("brand-b")).toContain("/brand-b/01/");
    expect(branded("brand-a").endsWith("/21/A%2F1%2B%21")).toBe(true);
    for (const brandSlug of ["01", "brand/a", "Brand-A", ".", "brand%2Fa"]) {
      expect(() => branded(brandSlug)).toThrow("Invalid brand slug");
    }
    expect(() =>
      buildBrandedDigitalLinkUri({
        baseUrl: "http://id.product-icode.example",
        brandSlug: "brand-a",
        gtin: "04012345678901",
      }),
    ).toThrow("Untrusted Digital Link base URL");
    for (const baseUrl of [
      "https://id.product-icode.example//",
      "https://id.product-icode.example/nested/",
      "https://attacker.example/",
    ]) {
      expect(() =>
        buildBrandedDigitalLinkUri({
          baseUrl,
          brandSlug: "brand-a",
          gtin: "04012345678901",
        }),
      ).toThrow("Untrusted Digital Link base URL");
    }
    expect(() =>
      buildBrandedDigitalLinkUri({
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug: "brand-a",
        gtin: "04012345678902",
      }),
    ).toThrow("Invalid GTIN");
  });

  it("generates ten candidates and reuses createProductUnits for duplicate prevention", () => {
    const generated = generateSerialCandidates({ prefix: "APM26", start: 1, count: 10 });
    expect(generated).toEqual({
      ok: true,
      serials: Array.from(
        { length: 10 },
        (_, index) => `APM26${String(index + 1).padStart(6, "0")}`,
      ),
    });
    if (!generated.ok) return;
    let id = 0;
    const created = createProductUnits(
      initialState(),
      {
        productId: demoProduct.id,
        batchId: "demo-batch-2026-11",
        serials: generated.serials,
      },
      { createId: () => String(++id), now: () => "2026-11-14T00:00:00Z" },
    );
    expect(created.created).toHaveLength(10);
    const uris = created.created.map((unit) => {
      const identity = created.state.identities.find((entry) => entry.unitId === unit.id)!;
      return buildBrandedDigitalLinkUri({
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug: "nova-home",
        gtin: identity.gtin,
        serial: identity.serial,
      });
    });
    expect(new Set(uris).size).toBe(10);
    const repeated = createProductUnits(created.state, {
      productId: demoProduct.id,
      batchId: "demo-batch-2026-11",
      serials: generated.serials,
    });
    expect(repeated.created).toHaveLength(0);
    expect(repeated.rejected).toHaveLength(10);
    expect(repeated.rejected.every((entry) => entry.reason === "Duplicate GTIN + serial")).toBe(
      true,
    );
  });

  it("reports serial candidate input and AI (21) boundary errors", () => {
    expect(generateSerialCandidates({ prefix: "序列", start: 0, count: 1 })).toMatchObject({
      ok: false,
      code: "INVALID_PREFIX",
    });
    expect(generateSerialCandidates({ prefix: "A", start: -1, count: 1 })).toMatchObject({
      ok: false,
      code: "INVALID_START",
    });
    expect(generateSerialCandidates({ prefix: "A", start: 0, count: 1001 })).toMatchObject({
      ok: false,
      code: "INVALID_COUNT",
    });
    expect(generateSerialCandidates({ prefix: "A".repeat(15), start: 0, count: 1 })).toMatchObject({
      ok: false,
      code: "SERIAL_OVERFLOW",
    });
    expect(
      generateSerialCandidates({ prefix: "A", start: Number.MAX_SAFE_INTEGER, count: 2 }),
    ).toMatchObject({ ok: false, code: "SERIAL_OVERFLOW" });
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

  it("exports the selected product and batch with safe CSV fields and branded URIs", () => {
    const state = initialState();
    const selectedBatch = state.batches[0]!;
    const firstUnit = state.units[0]!;
    const scoped = {
      ...state,
      products: state.products.map((entry) => ({
        ...entry,
        draft: { ...entry.draft, sku: '=CMD("quoted,sku")' },
      })),
      batches: state.batches.map((batch) =>
        batch.id === selectedBatch.id ? { ...batch, batchNumber: 'Batch, "A"\nLine' } : batch,
      ),
      units: [
        ...state.units,
        { ...firstUnit, id: "other-batch-unit", batchId: "other-batch", serial: "OTHER" },
      ],
    };
    const csv = buildUnitExportCsv(scoped, {
      productId: demoProduct.id,
      batchId: selectedBatch.id,
      baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
      brandSlug: "nova-home",
    });
    expect(csv).toContain('"\'=CMD(""quoted,sku"")"');
    expect(csv).toContain('"Batch, ""A""\nLine"');
    expect(csv).toContain("https://id.product-icode.example/nova-home/01/");
    expect(csv).not.toContain("OTHER");
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

