import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  assertIssuedGtinUnchanged,
  normalizeGtin14,
  saveDraft,
  type DemoState,
  type Product,
} from "./domain";

export type ProductImportMode = "create-only" | "update-only" | "upsert";
export type ProductImportField =
  | "externalProductId"
  | "sku"
  | "brand"
  | "model"
  | "name"
  | "gtin"
  | "manufacturer"
  | "imageUrl"
  | "description.en"
  | "description.de"
  | "description.zh"
  | "materials"
  | "specs";
export type ProductImportAction = "create" | "update" | "skip" | "conflict" | "error";
export type ProductImportIssueCode =
  | "MISSING_SKU"
  | "INVALID_SKU"
  | "MISSING_BRAND"
  | "MISSING_NAME"
  | "INVALID_GTIN"
  | "DUPLICATE_EXTERNAL_ID"
  | "DUPLICATE_SKU"
  | "DUPLICATE_GTIN"
  | "EXTERNAL_ID_CONFLICT"
  | "CROSS_BRAND_SKU_CONFLICT"
  | "GTIN_CONFLICT"
  | "AMBIGUOUS_MATCH"
  | "CLEAR_NOT_ALLOWED"
  | "ISSUED_GTIN_IMMUTABLE"
  | "EXISTING_PRODUCT"
  | "PRODUCT_NOT_FOUND"
  | "NO_CHANGES";
export type ProductImportIssue = { code: ProductImportIssueCode; message: string };
export type ProductImportChange = { field: ProductImportField; from: string; to: string };
export type ProductImportTable = {
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
  sheetName?: string;
};
export type ProductImportOptions = {
  mode: ProductImportMode;
  fieldMapping: Record<string, ProductImportField>;
  clearFields?: ProductImportField[];
  clearToken?: string;
};
export type ProductImportPreviewRow = {
  rowNumber: number;
  action: ProductImportAction;
  productId?: string;
  changes: ProductImportChange[];
  issues: ProductImportIssue[];
};
export type ProductImportPlan = {
  rows: ProductImportPreviewRow[];
  counts: Record<ProductImportAction, number>;
  signature: string;
  request: { table: ProductImportTable; options: ProductImportOptions };
};
export type ProductImportApplyResult = {
  state: DemoState;
  rows: ProductImportPreviewRow[];
  counts: Record<ProductImportAction, number>;
};

type MappedRow = {
  rowNumber: number;
  values: Partial<Record<ProductImportField, string>>;
  issues: ProductImportIssue[];
};
type PlannedRow = ProductImportPreviewRow & { nextDraft?: Product; mapped: MappedRow["values"] };

export const PRODUCT_IMPORT_TEMPLATE_COLUMNS: ProductImportField[] = [
  "externalProductId",
  "sku",
  "brand",
  "model",
  "name",
  "gtin",
  "manufacturer",
  "imageUrl",
  "description.en",
  "description.de",
  "description.zh",
  "materials",
  "specs",
];
export const PRODUCT_IMPORT_HEADER_ALIASES: Record<ProductImportField, readonly string[]> = {
  externalProductId: ["externalProductId", "external_id", "外部产品ID", "Externe Produkt-ID"],
  sku: ["sku", "SKU", "货号", "Artikelnummer"],
  brand: ["brand", "品牌", "Marke"],
  model: ["model", "型号", "Modell"],
  name: ["name", "product_name", "产品名称", "Produktname"],
  gtin: ["gtin", "GTIN", "条码", "GTIN/EAN"],
  manufacturer: ["manufacturer", "制造商", "Hersteller"],
  imageUrl: ["imageUrl", "image_url", "图片链接", "Bild-URL"],
  "description.en": ["description.en", "description_en", "英文描述"],
  "description.de": ["description.de", "description_de", "德文描述"],
  "description.zh": ["description.zh", "description_zh", "中文描述"],
  materials: ["materials", "材料", "Materialien"],
  specs: ["specs", "specifications", "规格", "Spezifikationen"],
};
export const PRODUCT_IMPORT_CSV_TEMPLATE = `${PRODUCT_IMPORT_TEMPLATE_COLUMNS.join(",")}\nEXT-001,SKU-001,Brand A,Model 1,Example product,04012345678901,,,,,,,`;

const CLEARABLE_FIELDS = new Set<ProductImportField>([
  "model",
  "gtin",
  "manufacturer",
  "imageUrl",
  "description.en",
  "description.de",
  "description.zh",
  "materials",
  "specs",
]);
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/;

export class ProductImportError extends Error {
  constructor(
    readonly code:
      | "EMPTY_FILE"
      | "DUPLICATE_HEADER"
      | "CSV_PARSE_ERROR"
      | "XLSX_PARSE_ERROR"
      | "MULTIPLE_SHEETS_REQUIRE_SELECTION"
      | "SHEET_NOT_FOUND"
      | "MISSING_SOURCE_COLUMN"
      | "CONFIRMATION_REQUIRED"
      | "STALE_PREVIEW",
    message: string,
  ) {
    super(message);
  }
}

function tableFromMatrix(matrix: unknown[][], sheetName?: string): ProductImportTable {
  if (!matrix.length) throw new ProductImportError("EMPTY_FILE", "Import file is empty.");
  const headers = matrix[0]!.map((value, index) =>
    String(value ?? "")
      .replace(index === 0 ? /^\uFEFF/ : /$^/, "")
      .trim(),
  );
  if (!headers.some(Boolean))
    throw new ProductImportError("EMPTY_FILE", "Import header row is empty.");
  const present = headers.filter(Boolean);
  if (new Set(present).size !== present.length)
    throw new ProductImportError("DUPLICATE_HEADER", "Import headers must be unique.");
  const rows = matrix.slice(1).flatMap((cells, index) => {
    const values = Object.fromEntries(
      headers.map((header, column) => [header, String(cells[column] ?? "")]),
    );
    return Object.values(values).some((value) => value.trim())
      ? [{ rowNumber: index + 2, values }]
      : [];
  });
  return { headers, rows, ...(sheetName ? { sheetName } : {}) };
}

export function parseProductCsv(source: string, options: { delimiter?: string } = {}) {
  const result = Papa.parse<string[]>(source.replace(/^\uFEFF/, ""), {
    delimiter: options.delimiter,
    skipEmptyLines: "greedy",
  });
  if (result.errors.length)
    throw new ProductImportError(
      "CSV_PARSE_ERROR",
      result.errors.map((error) => `row ${error.row ?? "?"}: ${error.message}`).join("; "),
    );
  return tableFromMatrix(result.data);
}

export function parseProductXlsx(
  source: ArrayBuffer | Uint8Array,
  options: { sheetName?: string } = {},
) {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(source, { type: source instanceof ArrayBuffer ? "array" : "buffer" });
  } catch {
    throw new ProductImportError("XLSX_PARSE_ERROR", "The XLSX workbook could not be parsed.");
  }
  if (!workbook.SheetNames.length)
    throw new ProductImportError("EMPTY_FILE", "The XLSX workbook has no worksheets.");
  if (workbook.SheetNames.length > 1 && !options.sheetName)
    throw new ProductImportError(
      "MULTIPLE_SHEETS_REQUIRE_SELECTION",
      "Select one worksheet before importing a multi-sheet workbook.",
    );
  const sheetName = options.sheetName ?? workbook.SheetNames[0]!;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new ProductImportError("SHEET_NOT_FOUND", `Worksheet not found: ${sheetName}`);
  return tableFromMatrix(
    XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" }),
    sheetName,
  );
}

function issue(code: ProductImportIssueCode, message: string): ProductImportIssue {
  return { code, message };
}
function key(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}
function mapRows(table: ProductImportTable, options: ProductImportOptions): MappedRow[] {
  for (const sourceHeader of Object.keys(options.fieldMapping)) {
    if (!table.headers.includes(sourceHeader))
      throw new ProductImportError(
        "MISSING_SOURCE_COLUMN",
        `Mapped source column is missing: ${sourceHeader}`,
      );
  }
  const clearToken = options.clearToken ?? "__CLEAR__";
  const clearFields = new Set(options.clearFields ?? []);
  return table.rows.map((row) => {
    const values: MappedRow["values"] = {};
    const issues: ProductImportIssue[] = [];
    for (const [sourceHeader, field] of Object.entries(options.fieldMapping)) {
      const raw = row.values[sourceHeader]?.trim() ?? "";
      if (!raw) continue;
      if (raw === clearToken) {
        if (!CLEARABLE_FIELDS.has(field) || !clearFields.has(field)) {
          issues.push(
            issue("CLEAR_NOT_ALLOWED", `Field cannot be cleared without permission: ${field}`),
          );
          continue;
        }
        values[field] = "";
      } else values[field] = raw;
    }
    return { rowNumber: row.rowNumber, values, issues };
  });
}

function validateMappedRows(rows: MappedRow[]) {
  const externalCounts = new Map<string, number>();
  const skuCounts = new Map<string, number>();
  const gtinCounts = new Map<string, number>();
  for (const row of rows) {
    const external = key(row.values.externalProductId);
    const sku = key(row.values.sku);
    const brand = key(row.values.brand);
    const gtin = row.values.gtin ? normalizeGtin14(row.values.gtin) : null;
    if (external) externalCounts.set(external, (externalCounts.get(external) ?? 0) + 1);
    if (sku && brand)
      skuCounts.set(`${brand}\u001f${sku}`, (skuCounts.get(`${brand}\u001f${sku}`) ?? 0) + 1);
    if (gtin) gtinCounts.set(gtin, (gtinCounts.get(gtin) ?? 0) + 1);
  }
  for (const row of rows) {
    const { values } = row;
    const sku = key(values.sku);
    const brand = key(values.brand);
    const external = key(values.externalProductId);
    const gtin = values.gtin ? normalizeGtin14(values.gtin) : null;
    if (!values.sku) row.issues.push(issue("MISSING_SKU", "SKU is required."));
    else if (!SKU_PATTERN.test(values.sku))
      row.issues.push(issue("INVALID_SKU", "SKU format is invalid."));
    if (!values.brand) row.issues.push(issue("MISSING_BRAND", "Brand is required."));
    if (values.gtin && !gtin)
      row.issues.push(issue("INVALID_GTIN", "GTIN check digit or length is invalid."));
    if (external && (externalCounts.get(external) ?? 0) > 1)
      row.issues.push(
        issue("DUPLICATE_EXTERNAL_ID", "External product ID is duplicated in the file."),
      );
    if (sku && brand && (skuCounts.get(`${brand}\u001f${sku}`) ?? 0) > 1)
      row.issues.push(issue("DUPLICATE_SKU", "Brand and SKU are duplicated in the file."));
    if (gtin && (gtinCounts.get(gtin) ?? 0) > 1)
      row.issues.push(issue("DUPLICATE_GTIN", "GTIN is duplicated in the file."));
  }
}

function applyValues(product: Product, values: MappedRow["values"]): Product {
  const next = structuredClone(product);
  if (values.externalProductId !== undefined) next.externalProductId = values.externalProductId;
  if (values.sku !== undefined) next.sku = values.sku;
  if (values.brand !== undefined) next.brand = values.brand;
  if (values.model !== undefined) next.model = values.model;
  if (values.name !== undefined) next.name = values.name;
  if (values.gtin !== undefined) {
    const gtin = values.gtin ? normalizeGtin14(values.gtin)! : "";
    if (gtin !== next.gtin) {
      next.gtin = gtin;
      next.gtinStatus = gtin ? "Format valid · unverified" : "Demo";
    }
  }
  if (values.manufacturer !== undefined) next.manufacturer = values.manufacturer;
  if (values.imageUrl !== undefined) next.image = values.imageUrl;
  if (values["description.en"] !== undefined) next.description.en = values["description.en"];
  if (values["description.de"] !== undefined) next.description.de = values["description.de"];
  if (values["description.zh"] !== undefined) next.description.zh = values["description.zh"];
  if (values.materials !== undefined) next.materials = values.materials;
  if (values.specs !== undefined) next.specs = values.specs;
  return next;
}

function blankProduct(values: MappedRow["values"]): Product {
  const skuSlug = values
    .sku!.toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return applyValues(
    {
      id: "",
      slug: skuSlug || "imported-product",
      name: "",
      brand: "",
      model: "",
      sku: "",
      gtin: "",
      gtinStatus: "Demo",
      asin: "",
      image: "",
      description: { en: "", de: "", zh: "" },
      manual: { en: "", de: "", zh: "" },
      video: "",
      faq: { en: "", de: "", zh: "" },
      manufacturer: "",
      materials: "",
      specs: "",
    },
    values,
  );
}

function fieldValue(product: Product, field: ProductImportField) {
  if (field === "imageUrl") return product.image;
  if (field.startsWith("description."))
    return product.description[field.slice(-2) as "en" | "de" | "zh"];
  return String(
    product[field as Exclude<ProductImportField, "imageUrl" | `description.${string}`>] ?? "",
  );
}
function changesFor(before: Product, after: Product, fields: ProductImportField[]) {
  return [...new Set(fields)].flatMap((field) => {
    const from = fieldValue(before, field);
    const to = fieldValue(after, field);
    return from === to ? [] : [{ field, from, to }];
  });
}
function rowActionForIssues(issues: ProductImportIssue[]) {
  const validation = new Set<ProductImportIssueCode>([
    "MISSING_SKU",
    "INVALID_SKU",
    "MISSING_BRAND",
    "MISSING_NAME",
    "INVALID_GTIN",
    "CLEAR_NOT_ALLOWED",
  ]);
  return issues.some((entry) => validation.has(entry.code)) ? "error" : "conflict";
}

function hasGtinConflict(state: DemoState, gtin: string, exceptProductId?: string) {
  if (
    state.products.some(
      (entry) =>
        entry.draft.id !== exceptProductId &&
        (normalizeGtin14(entry.draft.gtin) === gtin ||
          normalizeGtin14(entry.published?.gtin ?? "") === gtin),
    )
  )
    return true;
  return state.identities.some((identity) => {
    if (identity.gtin !== gtin) return false;
    const unit = state.units.find((entry) => entry.id === identity.unitId);
    return unit?.productId !== exceptProductId;
  });
}

function planRows(
  state: DemoState,
  table: ProductImportTable,
  options: ProductImportOptions,
): PlannedRow[] {
  const mapped = mapRows(table, options);
  validateMappedRows(mapped);
  return mapped.map((row): PlannedRow => {
    const base = { rowNumber: row.rowNumber, changes: [], mapped: row.values };
    if (row.issues.length)
      return { ...base, action: rowActionForIssues(row.issues), issues: row.issues };
    const external = key(row.values.externalProductId);
    const sku = key(row.values.sku);
    const brand = key(row.values.brand);
    const externalMatches = external
      ? state.products.filter((entry) => key(entry.draft.externalProductId) === external)
      : [];
    const skuMatches = state.products.filter(
      (entry) => key(entry.draft.sku) === sku && key(entry.draft.brand) === brand,
    );
    if (externalMatches.length > 1 || (!external && skuMatches.length > 1))
      return {
        ...base,
        action: "conflict",
        issues: [issue("AMBIGUOUS_MATCH", "More than one product matches the controlled key.")],
      };
    const externalMatch = externalMatches[0];
    if (
      external &&
      ((!externalMatch && skuMatches.length) ||
        (externalMatch && skuMatches.some((entry) => entry.draft.id !== externalMatch.draft.id)))
    )
      return {
        ...base,
        action: "conflict",
        issues: [
          issue(
            "EXTERNAL_ID_CONFLICT",
            "External product ID and brand/SKU identify different products.",
          ),
        ],
      };
    const existing = external ? externalMatch : skuMatches[0];
    if (externalMatches[0] && key(externalMatches[0].draft.brand) !== brand)
      return {
        ...base,
        action: "conflict",
        issues: [issue("EXTERNAL_ID_CONFLICT", "External product ID belongs to another brand.")],
      };
    if (options.mode === "create-only" && existing)
      return {
        ...base,
        action: "skip",
        productId: existing.draft.id,
        issues: [issue("EXISTING_PRODUCT", "Product already exists.")],
      };
    if (options.mode === "update-only" && !existing)
      return {
        ...base,
        action: "skip",
        issues: [issue("PRODUCT_NOT_FOUND", "No product matches the controlled key.")],
      };
    if (!existing) {
      if (!row.values.name)
        return {
          ...base,
          action: "error",
          issues: [issue("MISSING_NAME", "Product name is required for creation.")],
        };
      const draft = blankProduct(row.values);
      const gtinConflict = draft.gtin && hasGtinConflict(state, draft.gtin);
      if (gtinConflict)
        return {
          ...base,
          action: "conflict",
          issues: [issue("GTIN_CONFLICT", "GTIN already belongs to another product.")],
        };
      return {
        ...base,
        action: "create",
        nextDraft: draft,
        changes: Object.keys(row.values).map((field) => ({
          field: field as ProductImportField,
          from: "",
          to: row.values[field as ProductImportField]!,
        })),
        issues: [],
      };
    }
    const nextDraft = applyValues(existing.draft, row.values);
    const gtinConflict =
      nextDraft.gtin && hasGtinConflict(state, nextDraft.gtin, existing.draft.id);
    if (gtinConflict)
      return {
        ...base,
        action: "conflict",
        productId: existing.draft.id,
        issues: [issue("GTIN_CONFLICT", "GTIN already belongs to another product.")],
      };
    try {
      assertIssuedGtinUnchanged(state, nextDraft);
    } catch {
      return {
        ...base,
        action: "conflict",
        productId: existing.draft.id,
        issues: [
          issue(
            "ISSUED_GTIN_IMMUTABLE",
            "GTIN is locked because unit identities have been issued.",
          ),
        ],
      };
    }
    const changes = changesFor(
      existing.draft,
      nextDraft,
      Object.keys(row.values) as ProductImportField[],
    );
    return changes.length
      ? { ...base, action: "update", productId: existing.draft.id, nextDraft, changes, issues: [] }
      : {
          ...base,
          action: "skip",
          productId: existing.draft.id,
          issues: [issue("NO_CHANGES", "Draft already contains these values.")],
        };
  });
}

function publicRow(row: PlannedRow): ProductImportPreviewRow {
  const { mapped: _mapped, nextDraft: _nextDraft, ...preview } = row;
  return preview;
}
function counts(rows: ProductImportPreviewRow[]) {
  return rows.reduce<Record<ProductImportAction, number>>(
    (result, row) => ({ ...result, [row.action]: result[row.action] + 1 }),
    { create: 0, update: 0, skip: 0, conflict: 0, error: 0 },
  );
}
function signature(rows: ProductImportPreviewRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      rowNumber: row.rowNumber,
      action: row.action,
      productId: row.productId,
      changes: row.changes,
      issues: row.issues.map((entry) => entry.code),
    })),
  );
}

/** Dry-run example: parseProductCsv(text) -> previewProductImport(state, table, options). */
export function previewProductImport(
  state: DemoState,
  table: ProductImportTable,
  options: ProductImportOptions,
): ProductImportPlan {
  const rows = planRows(state, table, options).map(publicRow);
  return {
    rows,
    counts: counts(rows),
    signature: signature(rows),
    request: { table: structuredClone(table), options: structuredClone(options) },
  };
}

export function applyProductImport(
  state: DemoState,
  plan: ProductImportPlan,
  confirmation: { confirmed: true; createId?: () => string },
): ProductImportApplyResult {
  if (confirmation.confirmed !== true)
    throw new ProductImportError("CONFIRMATION_REQUIRED", "Explicit confirmation is required.");
  const replanned = planRows(state, plan.request.table, plan.request.options);
  const previewRows = replanned.map(publicRow);
  if (signature(previewRows) !== plan.signature)
    throw new ProductImportError(
      "STALE_PREVIEW",
      "Import state changed after preview; run dry-run again.",
    );
  const createId = confirmation.createId ?? (() => crypto.randomUUID());
  let nextState = state;
  const resultRows = [...previewRows];
  for (const [index, row] of replanned.entries()) {
    if (row.action === "create" && row.nextDraft) {
      const id = `import-${createId()}`;
      nextState = saveDraft(nextState, {
        ...row.nextDraft,
        id,
        slug: `${row.nextDraft.slug}-${id.slice(-8)}`,
      });
      resultRows[index] = { ...resultRows[index]!, productId: id };
    } else if (row.action === "update" && row.nextDraft) {
      nextState = saveDraft(nextState, row.nextDraft);
    }
  }
  return { state: nextState, rows: resultRows, counts: counts(resultRows) };
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function serializeProductImportResultCsv(result: Pick<ProductImportApplyResult, "rows">) {
  return [
    "rowNumber,status,productId,errorCodes,message",
    ...result.rows.map((row) =>
      [
        String(row.rowNumber),
        row.action,
        row.productId ?? "",
        row.issues.map((entry) => entry.code).join("|"),
        row.issues.map((entry) => entry.message).join("; "),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}

