import Papa from "papaparse";
import type { ProductEntry } from "./domain";
import {
  PRODUCT_IMPORT_HEADER_ALIASES,
  PRODUCT_IMPORT_TEMPLATE_COLUMNS,
  type ProductImportField,
  type ProductImportTable,
} from "./product-import";

export const PRODUCT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 1000;
export const catalogPageSizes = [10, 20, 50, 100] as const;

export function importLimitError(bytes: number, rows = 0) {
  if (bytes > PRODUCT_IMPORT_MAX_BYTES) return "Import.fileLimit";
  if (rows > PRODUCT_IMPORT_MAX_ROWS) return "Import.rowLimit";
  return undefined;
}

// Exact, declared aliases only. Suggestions remain editable until explicit review.
export function suggestProductMapping(headers: string[]) {
  const mapping: Record<string, ProductImportField> = {};
  const used = new Set<ProductImportField>();
  for (const header of headers) {
    const field = PRODUCT_IMPORT_TEMPLATE_COLUMNS.find((candidate) =>
      PRODUCT_IMPORT_HEADER_ALIASES[candidate].includes(header),
    );
    if (field && !used.has(field)) {
      mapping[header] = field;
      used.add(field);
    }
  }
  return mapping;
}

export function catalogRows(
  products: ProductEntry[],
  filters: { query: string; brand: string; status: string },
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return products.filter(
    ({ draft, published }) =>
      (!filters.brand || draft.brand === filters.brand) &&
      (!filters.status || (published ? "Published" : "Draft") === filters.status) &&
      (!query ||
        [draft.sku, draft.gtin, draft.name, draft.model, draft.brand].some((value) =>
          value.toLocaleLowerCase().includes(query),
        )),
  );
}

export function catalogExportCsv(rows: ProductEntry[]) {
  const fields = [...PRODUCT_IMPORT_TEMPLATE_COLUMNS, "publicationStatus"];
  return Papa.unparse(
    {
      fields,
      data: rows.map(({ draft, published }) => ({
        externalProductId: draft.externalProductId ?? "",
        sku: draft.sku,
        brand: draft.brand,
        model: draft.model,
        name: draft.name,
        gtin: draft.gtin,
        manufacturer: draft.manufacturer,
        imageUrl: draft.image,
        "description.en": draft.description.en,
        "description.de": draft.description.de,
        "description.zh": draft.description.zh,
        materials: draft.materials,
        specs: draft.specs,
        publicationStatus: published ? "Published" : "Draft",
      })),
    },
    { escapeFormulae: true },
  );
}

export function validateProductMapping(
  table: ProductImportTable,
  mapping: Record<string, ProductImportField>,
) {
  const values = Object.values(mapping);
  return (
    values.includes("sku") &&
    values.includes("brand") &&
    new Set(values).size === values.length &&
    Object.keys(mapping).every((header) => table.headers.includes(header))
  );
}
