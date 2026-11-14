import { describe, expect, it } from "vitest";
import {
  buildDigitalLinkPath,
  buildDigitalLinkUri,
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
import { createQrArtifacts } from "@/features/connect/digital-link-qr";
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

  it("builds an absolute URI only for an explicitly trusted HTTPS origin", () => {
    expect(buildDigitalLinkUri(DEMO_DIGITAL_LINK_BASE_URL, "04012345678901", "A/1+!")).toBe(
      "https://demo.icodeconnect.example/01/04012345678901/21/A%2F1%2B%21",
    );
    expect(() =>
      buildDigitalLinkUri("http://demo.icodeconnect.example", "04012345678901", "A1"),
    ).toThrow("Untrusted Digital Link base URL");
    expect(() => buildDigitalLinkUri("https://attacker.example", "04012345678901", "A1")).toThrow(
      "Untrusted Digital Link base URL",
    );
  });

  it("generates ten fixed-width serials and rejects invalid or colliding ranges", () => {
    expect(generateSerialCandidates({ prefix: "NH26", start: 129, count: 10 })).toEqual({
      ok: true,
      serials: Array.from(
        { length: 10 },
        (_, index) => `NH26${String(129 + index).padStart(6, "0")}`,
      ),
    });
    expect(
      generateSerialCandidates({ prefix: "NH26", start: 129, count: 10, existing: ["NH26000133"] }),
    ).toMatchObject({
      ok: false,
      code: "DUPLICATE_SERIAL",
    });
    expect(generateSerialCandidates({ prefix: "序列", start: 0, count: 1 })).toMatchObject({
      ok: false,
      code: "INVALID_PREFIX",
    });
    expect(generateSerialCandidates({ prefix: "A", start: 0, count: 1001 })).toMatchObject({
      ok: false,
      code: "INVALID_COUNT",
    });
    expect(generateSerialCandidates({ prefix: "A".repeat(15), start: 0, count: 1 })).toMatchObject({
      ok: false,
      code: "SERIAL_OVERFLOW",
    });
    expect(generateSerialCandidates({ prefix: "A", start: 999999, count: 2 })).toMatchObject({
      ok: false,
      code: "SERIAL_OVERFLOW",
    });
  });

  it("creates real PNG and SVG QR artifacts whose content matches each unique URI", async () => {
    const generated = generateSerialCandidates({ prefix: "QR", start: 1, count: 10 });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const uris = generated.serials.map((value) =>
      buildDigitalLinkUri(DEMO_DIGITAL_LINK_BASE_URL, "04012345678901", value),
    );
    const artifacts = await Promise.all(uris.map(createQrArtifacts));
    expect(new Set(artifacts.map((item) => item.content))).toEqual(new Set(uris));
    expect(new Set(artifacts.map((item) => item.pngDataUrl)).size).toBe(10);
    expect(artifacts.every((item) => item.pngDataUrl.startsWith("data:image/png;base64,"))).toBe(
      true,
    );
    expect(artifacts.every((item) => item.svg.includes("<svg"))).toBe(true);
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

  it("exports only the selected product and batch with safe CSV cells and absolute URIs", () => {
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
        {
          ...firstUnit,
          id: "other-batch-unit",
          batchId: "other-batch",
          serial: "OTHER",
        },
      ],
    };
    const csv = buildUnitExportCsv(scoped, {
      productId: demoProduct.id,
      batchId: selectedBatch.id,
      baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
    });
    expect(csv).toContain('"\'=CMD(""quoted,sku"")"');
    expect(csv).toContain('"Batch, ""A""\nLine"');
    expect(csv).toContain("https://demo.icodeconnect.example/01/");
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

