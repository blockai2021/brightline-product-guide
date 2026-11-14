import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { initialState } from "../features/connect/seed";
import { createProductUnits } from "../features/connect/domain";
import {
  cancelPrintJob,
  confirmPrintJob,
  exportPrintJob,
  pdfSampleRows,
  preparePrintJob,
  printChecksum,
} from "../features/connect/printing";

function setup(count = 10) {
  const seed = initialState();
  const product = seed.products[0]?.draft;
  const batch = seed.batches.find((b) => b.productId === product?.id);
  if (!product || !batch) throw new Error("Missing fixture");
  const result = createProductUnits(seed, {
    productId: product.id,
    batchId: batch.id,
    serials: Array.from({ length: count }, (_, i) => `PRINT${String(i).padStart(6, "0")}`),
  });
  const input = {
    productId: product.id,
    batchId: batch.id,
    unitIds: result.created.map((u) => u.id),
  };
  const job = preparePrintJob(result.state, [], input, {
    id: "job-1",
    now: "2026-11-14T13:00:00Z",
  });
  return { state: result.state, input, job };
}
describe("L-009 browser-local print jobs", () => {
  it.each([10, 100])(
    "freezes %i issued identities into ordered CSV without new serials",
    (count) => {
      const { state, input, job } = setup(count);
      const before = JSON.stringify(state);
      const rows = Papa.parse<Record<string, string>>(job.files.data, { header: true }).data;
      expect(rows).toHaveLength(count);
      expect(new Set(rows.map((r) => r["serial"])).size).toBe(count);
      for (const [i, row] of rows.entries()) {
        expect(row["sequence"]).toBe(String(i + 1));
        expect(row["digitalLink"]).toBe(
          `https://id.product-icode.example/nova-home/01/${row["GTIN"]}/21/${row["serial"]}`,
        );
        expect(job.rows[i]?.unitId).toBe(input.unitIds[i]);
      }
      expect(JSON.stringify(state)).toBe(before);
      expect(job.checksum).toBe(printChecksum(job.files.data));
    },
  );
  it("export and re-download never confirm printing or change snapshot bytes", () => {
    const { job } = setup();
    const restored = JSON.parse(JSON.stringify(exportPrintJob(job))) as typeof job;
    expect(restored.status).toBe("Exported");
    expect(restored.confirmation).toBeUndefined();
    expect(exportPrintJob(restored).files).toEqual(job.files);
  });
  it("requires manual exported-state confirmation with operator, time and actual quantity", () => {
    const { job } = setup();
    expect(() => confirmPrintJob(job, "operator", 10, "")).toThrow("state");
    expect(() => confirmPrintJob(exportPrintJob(job), "", 10, "")).toThrow("confirmation");
    expect(() => confirmPrintJob(exportPrintJob(job), "operator", -1, "")).toThrow("confirmation");
    expect(() => confirmPrintJob(exportPrintJob(job), "operator", 11, "")).toThrow("confirmation");
    const confirmed = confirmPrintJob(
      exportPrintJob(job),
      "operator",
      8,
      "2 failed",
      "2026-11-14T14:00:00Z",
    );
    expect(confirmed.status).toBe("Manually confirmed printed");
    expect(confirmed.confirmation).toEqual({
      operator: "operator",
      actualCount: 8,
      notes: "2 failed",
      at: "2026-11-14T14:00:00Z",
    });
    expect(exportPrintJob(confirmed).status).toBe("Manually confirmed printed");
  });
  it("rejects overlapping tasks unless explicitly reprinting original identities with reason", () => {
    const { state, input, job } = setup();
    expect(() => preparePrintJob(state, [job], input)).toThrow("duplicate");
    expect(() =>
      preparePrintJob(state, [job], { ...input, originalJobId: job.id, reason: " " }),
    ).toThrow("reason");
    const reprint = preparePrintJob(state, [job], {
      ...input,
      unitIds: input.unitIds.slice(0, 2),
      originalJobId: job.id,
      reason: "damaged labels",
    });
    expect(reprint.originalJobId).toBe(job.id);
    expect(reprint.reprintReason).toBe("damaged labels");
    expect(reprint.rows).toEqual(job.rows.slice(0, 2));
    const cancelled = cancelPrintJob(job);
    expect(cancelled.status).toBe("Cancelled");
    expect(() => exportPrintJob(cancelled)).toThrow("state");
    expect(preparePrintJob(state, [cancelled], input).status).toBe("Prepared");
  });
  it("rejects cross-product, missing and mismatched identities", () => {
    const { state, input } = setup();
    expect(() => preparePrintJob(state, [], { ...input, batchId: "other-batch" })).toThrow("scope");
    expect(() => preparePrintJob(state, [], { ...input, unitIds: ["unknown"] })).toThrow(
      "identity",
    );
    expect(() => preparePrintJob({ ...state, identities: [] }, [], input)).toThrow("identity");
    const id = input.unitIds[0];
    expect(() =>
      preparePrintJob(
        {
          ...state,
          units: state.units.map((u) =>
            u.id === id ? { ...u, productId: "other-brand-product" } : u,
          ),
        },
        [],
        input,
      ),
    ).toThrow("identity");
  });
  it("safely escapes formulae, quotes and newlines and preserves frozen product data", () => {
    const { state, input } = setup();
    const changed = {
      ...state,
      products: state.products.map((p) => ({
        ...p,
        draft: { ...p.draft, sku: '=FORMULA,"x"\nnext' },
        published: p.published ? { ...p.published, sku: '=FORMULA,"x"\nnext' } : undefined,
      })),
    };
    // Keep exact optional fields aligned with ProductEntry.
    const safeState = {
      ...state,
      products: changed.products.map((p) =>
        p.published ? { draft: p.draft, published: p.published } : { draft: p.draft },
      ),
    };
    const job = preparePrintJob(safeState, [], input);
    const row = Papa.parse<Record<string, string>>(job.files.data, { header: true }).data[0];
    expect(row?.["SKU"]).toBe('\'=FORMULA,"x"\nnext');
    expect(exportPrintJob(job).files.data).toBe(job.files.data);
  });
  it("limits PDF to 20 issued samples and never silently truncates an over-limit request", () => {
    const { job } = setup(100);
    expect(pdfSampleRows(job, 20)).toHaveLength(20);
    expect(() => pdfSampleRows(job, 21)).toThrow("pdfLimit");
    expect(() => pdfSampleRows(job, 0)).toThrow("pdfLimit");
    expect(() => pdfSampleRows(setup(10).job, 11)).toThrow("pdfLimit");
  });
});

