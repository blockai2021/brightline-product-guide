import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import Papa from "papaparse";
import { PNG } from "pngjs";
import {
  buildBrandedDigitalLinkUri,
  createProductUnits,
  DEMO_DIGITAL_LINK_BASE_URL,
  generateSerialCandidates,
  normalizeGtin14,
} from "@/features/connect/domain";
import { createQrArtifacts, productBrandSlug } from "@/features/connect/digital-link-qr";
import {
  applyProductImport,
  parseProductCsv,
  previewProductImport,
  type ProductImportOptions,
} from "@/features/connect/product-import";
import { confirmPrintJob, exportPrintJob, preparePrintJob } from "@/features/connect/printing";
import { initialState } from "@/features/connect/seed";
import {
  buildMappingExportCsv,
  emptyMappingFilters,
  mappingRows,
} from "@/features/connect/transparency-table";

const importOptions: ProductImportOptions = {
  mode: "create-only",
  fieldMapping: {
    external_id: "externalProductId",
    sku: "sku",
    brand: "brand",
    name: "name",
    gtin: "gtin",
  },
};

function gtin14(index: number) {
  const body = `9506000${String(index).padStart(6, "0")}`;
  const sum = [...body]
    .reverse()
    .reduce((total, digit, position) => total + Number(digit) * (position % 2 === 0 ? 3 : 1), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

function decodePng(dataUrl: string) {
  const image = PNG.sync.read(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));
  return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data;
}

describe("QA-002 product import to identity, Transparency and printing integration", () => {
  it("keeps 100 imported SKUs and 100 issued identities consistent through QR, mapping and reprint", async () => {
    const initial = initialState();
    const publishedBefore = structuredClone(initial.products[0]?.published);
    const csv = [
      "external_id,sku,brand,name,gtin",
      ...Array.from({ length: 100 }, (_, index) =>
        [
          `QA-EXT-${index + 1}`,
          `QA-SKU-${String(index + 1).padStart(3, "0")}`,
          "QA Brand",
          `QA Product ${index + 1}`,
          gtin14(index + 1),
        ].join(","),
      ),
    ].join("\n");
    const plan = previewProductImport(initial, parseProductCsv(csv), importOptions);
    expect(plan.counts).toMatchObject({ create: 100, error: 0, conflict: 0 });

    let productId = 0;
    const imported = applyProductImport(initial, plan, {
      confirmed: true,
      createId: () => `qa-${++productId}`,
    });
    expect(imported.state.products).toHaveLength(initial.products.length + 100);
    expect(imported.state.products[0]?.published).toEqual(publishedBefore);
    expect(imported.state.products.slice(1).every((entry) => entry.published === undefined)).toBe(
      true,
    );

    const product = imported.state.products[1]?.draft;
    if (!product) throw new Error("Imported product missing");
    const batch = {
      id: "qa-batch-100",
      productId: product.id,
      batchNumber: "QA-BATCH-100",
      status: "Draft" as const,
    };
    const withBatch = { ...imported.state, batches: [...imported.state.batches, batch] };
    const generated = generateSerialCandidates({ prefix: "QA26", start: 1, count: 100 });
    if (!generated.ok) throw new Error(generated.message);
    let identityId = 0;
    const issued = createProductUnits(
      withBatch,
      { productId: product.id, batchId: batch.id, serials: generated.serials },
      {
        createId: () => `qa-identity-${++identityId}`,
        now: () => "2026-11-14T14:00:00Z",
      },
    );
    expect(issued.created).toHaveLength(100);
    expect(issued.rejected).toEqual([]);
    const identities = issued.created.map((unit) =>
      issued.state.identities.find((identity) => identity.unitId === unit.id),
    );
    expect(identities.every(Boolean)).toBe(true);
    expect(
      new Set(identities.map((identity) => `${identity?.gtin}:${identity?.serial}`)).size,
    ).toBe(100);
    expect(
      createProductUnits(issued.state, {
        productId: product.id,
        batchId: batch.id,
        serials: generated.serials,
      }).rejected,
    ).toHaveLength(100);

    const uris = identities.map((identity) => {
      if (!identity) throw new Error("Identity missing");
      return buildBrandedDigitalLinkUri({
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug: productBrandSlug(product),
        gtin: identity.gtin,
        serial: identity.serial,
      });
    });
    expect(new Set(uris).size).toBe(100);
    for (const uri of [uris[0], uris[99]]) {
      if (!uri) throw new Error("URI missing");
      const qr = await createQrArtifacts(uri);
      expect(decodePng(qr.png)).toBe(uri);
      expect(qr.svg).toContain("<svg");
    }

    const mapped = mappingRows(issued.state, {
      ...emptyMappingFilters,
      productId: product.id,
      batchId: batch.id,
    });
    expect(mapped).toHaveLength(100);
    expect(
      mappingRows(issued.state, {
        ...emptyMappingFilters,
        productId: product.id,
        batchId: "demo-batch-2026-11",
      }),
    ).toEqual([]);
    const mappingCsv = Papa.parse<Record<string, string>>(
      buildMappingExportCsv(issued.state, mapped),
      { header: true },
    ).data;
    expect(mappingCsv).toHaveLength(100);
    expect(new Set(mappingCsv.map((row) => row["absoluteUri"]))).toEqual(new Set(uris));

    const input = {
      productId: product.id,
      batchId: batch.id,
      unitIds: issued.created.map((unit) => unit.id),
    };
    const job = preparePrintJob(issued.state, [], input, {
      id: "qa-print-100",
      now: "2026-11-14T15:00:00Z",
    });
    const frozenFiles = structuredClone(job.files);
    const printRows = Papa.parse<Record<string, string>>(job.files.data, { header: true }).data;
    expect(printRows).toHaveLength(100);
    expect(new Set(printRows.map((row) => row["digitalLink"]))).toEqual(new Set(uris));
    expect(() => confirmPrintJob(exportPrintJob(job), "QA operator", 101, "invalid")).toThrow(
      "confirmation",
    );
    const confirmed = confirmPrintJob(
      exportPrintJob(job, "2026-11-14T15:10:00Z"),
      "QA operator",
      100,
      "verified against frozen CSV",
      "2026-11-14T15:20:00Z",
    );
    expect(confirmed.files).toEqual(frozenFiles);
    expect(confirmed.confirmation?.actualCount).toBe(100);

    expect(() => preparePrintJob(issued.state, [confirmed], input)).toThrow("duplicate");
    const reprint = preparePrintJob(
      issued.state,
      [confirmed],
      {
        ...input,
        unitIds: input.unitIds.slice(0, 5),
        originalJobId: confirmed.id,
        reason: "five labels damaged during application",
      },
      { id: "qa-reprint-5", now: "2026-11-14T16:00:00Z" },
    );
    expect(reprint.rows).toEqual(
      confirmed.rows.slice(0, 5).map((row, index) => ({ ...row, sequence: index + 1 })),
    );
    expect(reprint.originalJobId).toBe(confirmed.id);
    expect(job.files).toEqual(frozenFiles);
  });

  it("rejects an invalid GTIN during dry-run and writes nothing after confirmation", () => {
    const state = initialState();
    const table = parseProductCsv(
      "external_id,sku,brand,name,gtin\nQA-BAD,QA-BAD-GTIN,QA Brand,Bad GTIN,04012345678902",
    );
    const plan = previewProductImport(state, table, importOptions);
    expect(plan.counts.error).toBe(1);
    expect(plan.rows[0]?.issues.map((issue) => issue.code)).toContain("INVALID_GTIN");
    const result = applyProductImport(state, plan, { confirmed: true });
    expect(result.state).toEqual(state);
    expect(normalizeGtin14("04012345678902")).toBeNull();
  });
});
