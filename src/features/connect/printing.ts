import Papa from "papaparse";
import { buildUnitExportCsv, DEMO_DIGITAL_LINK_BASE_URL, type DemoState } from "./domain";
import { productBrandSlug } from "./digital-link-qr";

export const PRINT_PDF_LIMIT = 20;
export type PrintStatus = "Prepared" | "Exported" | "Manually confirmed printed" | "Cancelled";
export type PrintRow = {
  unitId: string;
  identityId: string;
  sequence: number;
  gtin: string;
  serial: string;
  digitalLink: string;
};
export type PrintJob = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  brand: string;
  batchId: string;
  batchNumber: string;
  createdAt: string;
  outputType: "CSV";
  formatVersion: 1;
  rows: PrintRow[];
  checksum: string;
  files: { data: string; manifest: string; readme: string };
  status: PrintStatus;
  exportedAt?: string;
  cancelledAt?: string;
  originalJobId?: string;
  reprintReason?: string;
  confirmation?: { operator: string; at: string; actualCount: number; notes: string };
};
export class PrintingError extends Error {
  constructor(
    readonly code:
      "scope" | "identity" | "duplicate" | "reason" | "state" | "confirmation" | "pdfLimit",
  ) {
    super(code);
  }
}
export function printChecksum(text: string) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619);
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
export function eligiblePrintUnits(state: DemoState, productId: string, batchId: string) {
  return state.units.filter(
    (unit) =>
      unit.productId === productId &&
      unit.batchId === batchId &&
      state.identities.some(
        (identity) => identity.unitId === unit.id && identity.serial === unit.serial,
      ),
  );
}
export function preparePrintJob(
  state: DemoState,
  jobs: PrintJob[],
  input: {
    productId: string;
    batchId: string;
    unitIds: string[];
    originalJobId?: string;
    reason?: string;
  },
  deps: { id?: string; now?: string } = {},
): PrintJob {
  const entry = state.products.find((p) => p.draft.id === input.productId);
  const product = entry?.published ?? entry?.draft;
  const batch = state.batches.find(
    (b) => b.id === input.batchId && b.productId === input.productId,
  );
  if (
    !product ||
    !batch ||
    !input.unitIds.length ||
    new Set(input.unitIds).size !== input.unitIds.length
  )
    throw new PrintingError("scope");
  const original = jobs.find((j) => j.id === input.originalJobId);
  if (
    input.originalJobId &&
    (!original ||
      original.productId !== product.id ||
      original.batchId !== batch.id ||
      original.status === "Cancelled" ||
      !input.reason?.trim())
  )
    throw new PrintingError("reason");
  if (
    !input.originalJobId &&
    jobs.some(
      (j) => j.status !== "Cancelled" && j.rows.some((r) => input.unitIds.includes(r.unitId)),
    )
  )
    throw new PrintingError("duplicate");
  const rows = input.unitIds.map((unitId, index): PrintRow => {
    const unit = state.units.find(
      (u) => u.id === unitId && u.productId === product.id && u.batchId === batch.id,
    );
    const identities = state.identities.filter((i) => i.unitId === unitId);
    const identity = identities[0];
    if (!unit || !identity || identities.length !== 1 || unit.serial !== identity.serial)
      throw new PrintingError("identity");
    if (original) {
      const frozen = original.rows.find(
        (r) =>
          r.unitId === unitId &&
          r.identityId === identity.id &&
          r.serial === identity.serial &&
          r.gtin === identity.gtin,
      );
      if (!frozen) throw new PrintingError("identity");
      return { ...frozen, sequence: index + 1 };
    }
    // Use the core scope serializer for identity-bound URI construction and escaping.
    const scope = { ...state, units: [unit] };
    const csv = buildUnitExportCsv(scope, {
      productId: product.id,
      batchId: batch.id,
      baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
      brandSlug: productBrandSlug(product),
    });
    const data = Papa.parse<Record<string, string>>(csv, { header: true }).data[0];
    if (!data?.["absoluteUri"] || data["GTIN"] !== identity.gtin)
      throw new PrintingError("identity");
    return {
      unitId,
      identityId: identity.id,
      sequence: index + 1,
      gtin: identity.gtin,
      serial: identity.serial,
      digitalLink: data["absoluteUri"],
    };
  });
  if (new Set(rows.map((r) => `${r.gtin}:${r.serial}`)).size !== rows.length)
    throw new PrintingError("identity");
  const id = deps.id ?? `print-${crypto.randomUUID()}`;
  const createdAt = deps.now ?? new Date().toISOString();
  const header = [
    "printJobId",
    "sequence",
    "productId",
    "SKU",
    "brand",
    "batchId",
    "batchNumber",
    "GTIN",
    "serial",
    "digitalLink",
  ];
  const sku = original?.sku ?? product.sku;
  const brand = original?.brand ?? product.brand;
  const batchNumber = original?.batchNumber ?? batch.batchNumber;
  const data =
    "\uFEFF" +
    Papa.unparse(
      {
        fields: header,
        data: rows.map((r) => [
          id,
          r.sequence,
          product.id,
          sku,
          brand,
          batch.id,
          batchNumber,
          r.gtin,
          r.serial,
          r.digitalLink,
        ]),
      },
      { quotes: true, escapeFormulae: /^[=+\-@\t\r]/, newline: "\r\n" },
    );
  const checksum = printChecksum(data);
  const manifest =
    "\uFEFF" +
    Papa.unparse(
      [
        {
          jobId: id,
          productId: product.id,
          SKU: sku,
          brand,
          batchId: batch.id,
          batchNumber,
          count: rows.length,
          createdAt,
          snapshotStatus: "Prepared",
          outputType: "CSV",
          formatVersion: 1,
          checksum,
          checksumAlgorithm:
            "FNV-1a 32-bit over UTF-8 print-data.csv including BOM (comparison only, not cryptographic)",
          originalJobId: original?.id ?? "",
          reprintReason: input.reason?.trim() ?? "",
        },
      ],
      { quotes: true, escapeFormulae: /^[=+\-@\t\r]/, newline: "\r\n" },
    );
  const readme = `Product iCode Connect — BROWSER-LOCAL DEMO ONLY\nJob: ${id}\nFormat version: 1; output: UTF-8 CSV with BOM\nSnapshot checksum: ${checksum} (FNV-1a32; comparison only, not a security signature).\nFiles remain frozen; snapshotStatus records creation state, not the current manual job status.\nMap digitalLink to the label software QR data source. Do not use a relative path or replace the host with the Lovable origin.\nColumns: printJobId = local job lookup; sequence = frozen label order; productId/SKU/brand = product; batchId/batchNumber = batch; GTIN = issued GTIN14; serial = original AI(21) serial; digitalLink = full demo HTTPS URI.\nKeep GTIN and serial as text; preserve leading zeros. CSV spreadsheet formula protection may prefix a dangerous cell with an apostrophe; import as text and remove only that protective prefix for the serial label text. QR data always comes from digitalLink.\nWARNING: Never print .example test codes onto commercial packaging. No production resolver or controlled production domain is configured.\nThis data is not Amazon authentication and does not prove GS1 ownership. Download does NOT confirm printing, labelling, warehousing or activation.\nManual confirmations are not device-verified. Reprints reuse original identities and can create duplicate physical labels.\nPDF: A4 fixed English technical template, maximum ${PRINT_PDF_LIMIT} sample labels, preview only. Factory must professionally verify dimensions, quiet zones, materials and barcode quality.\n${original ? `REPRINT of ${original.id}; reason: ${input.reason?.trim()}\n` : ""}`;
  return {
    id,
    productId: product.id,
    productName: original?.productName ?? product.name,
    sku,
    brand,
    batchId: batch.id,
    batchNumber,
    createdAt,
    outputType: "CSV",
    formatVersion: 1,
    rows,
    checksum,
    files: { data, manifest, readme },
    status: "Prepared",
    ...(original ? { originalJobId: original.id, reprintReason: input.reason?.trim() ?? "" } : {}),
  };
}
export function exportPrintJob(job: PrintJob, now = new Date().toISOString()): PrintJob {
  if (job.status === "Cancelled") throw new PrintingError("state");
  return {
    ...job,
    status: job.status === "Prepared" ? "Exported" : job.status,
    exportedAt: job.exportedAt ?? now,
  };
}
export function confirmPrintJob(
  job: PrintJob,
  operator: string,
  actualCount: number,
  notes: string,
  now = new Date().toISOString(),
): PrintJob {
  if (job.status !== "Exported") throw new PrintingError("state");
  if (
    !operator.trim() ||
    !Number.isSafeInteger(actualCount) ||
    actualCount < 0 ||
    actualCount > job.rows.length
  )
    throw new PrintingError("confirmation");
  return {
    ...job,
    status: "Manually confirmed printed",
    confirmation: { operator: operator.trim(), actualCount, notes, at: now },
  };
}
export function cancelPrintJob(job: PrintJob, now = new Date().toISOString()): PrintJob {
  if (job.status !== "Prepared" && job.status !== "Exported") throw new PrintingError("state");
  return { ...job, status: "Cancelled", cancelledAt: now };
}
export function pdfSampleRows(job: PrintJob, count: number) {
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > PRINT_PDF_LIMIT ||
    count > job.rows.length
  )
    throw new PrintingError("pdfLimit");
  return job.rows.slice(0, count);
}

