import QRCode from "qrcode";
import Papa from "papaparse";
import { findUnitByIdentity, normalizeGtin14, type DemoState, type Product } from "./domain";

// Brand paths are derived from the published brand when available, never from a product slug.
export function productBrandSlug(product: Product) {
  return product.brand
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolvePublishedProduct(
  state: DemoState,
  input: {
    slug?: string | undefined;
    brandSlug?: string | undefined;
    gtin?: string | undefined;
    serial?: string | undefined;
  },
) {
  if (!input.gtin) return state.products.find((p) => p.published?.slug === input.slug)?.published;
  const gtin = normalizeGtin14(input.gtin);
  if (!gtin) return undefined;
  const unit =
    input.serial === undefined ? undefined : findUnitByIdentity(state, gtin, input.serial);
  if (input.serial !== undefined && !unit) return undefined;
  const product = state.products.find(
    (p) =>
      p.published &&
      (unit ? p.published.id === unit.productId : normalizeGtin14(p.published.gtin) === gtin) &&
      (input.brandSlug === undefined || productBrandSlug(p.published) === input.brandSlug),
  )?.published;
  return product;
}

export async function createQrArtifacts(uri: string) {
  const options = { errorCorrectionLevel: "M" as const, margin: 4, width: 512 };
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(uri, options),
    QRCode.toString(uri, { ...options, type: "svg" }),
  ]);
  return { uri, png, svg };
}

export function parseSerialCsv(text: string) {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (result.errors.length) throw new Error("Invalid serial CSV");
  const rows = result.data;
  const headerIndex = rows[0]?.findIndex((cell) => cell.trim().toLowerCase() === "serial") ?? -1;
  return (headerIndex >= 0 ? rows.slice(1) : rows).map((row) =>
    (row[headerIndex >= 0 ? headerIndex : 0] ?? "").trim(),
  );
}

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function unitFileName(sku: string, serial: string) {
  return `${sku || "product"}-${serial}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}
