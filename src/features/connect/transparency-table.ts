import Papa from "papaparse";
import {
  buildUnitExportCsv,
  DEMO_DIGITAL_LINK_BASE_URL,
  type DemoState,
  type TransparencyAssociation,
} from "./domain";
import { productBrandSlug } from "./digital-link-qr";

export const mappingPageSizes = [10, 20, 50, 100] as const;
export type MappingFilters = {
  productId: string;
  batchId: string;
  keyword: string;
  official: string;
};
export const emptyMappingFilters: MappingFilters = {
  productId: "",
  batchId: "",
  keyword: "",
  official: "",
};

export function mappingRows(state: DemoState, filters: MappingFilters) {
  const products = new Map(state.products.map((entry) => [entry.draft.id, entry]));
  const batches = new Map(state.batches.map((batch) => [batch.id, batch]));
  const identities = new Map(state.identities.map((identity) => [identity.unitId, identity]));
  const associations = new Map(
    state.transparency.map((association) => [association.unitId, association]),
  );
  const keyword = filters.keyword.trim().toLowerCase();
  return state.units.flatMap((unit) => {
    const entry = products.get(unit.productId);
    const product = entry?.draft;
    const batch = batches.get(unit.batchId);
    const identity = identities.get(unit.id);
    const association = associations.get(unit.id);
    const official: TransparencyAssociation["state"] = association?.state ?? "Not enrolled";
    if (
      (filters.productId && unit.productId !== filters.productId) ||
      (filters.batchId && unit.batchId !== filters.batchId) ||
      (filters.official && official !== filters.official)
    )
      return [];
    if (
      keyword &&
      ![
        unit.productId,
        product?.name,
        product?.model,
        product?.sku,
        product?.gtin,
        identity?.gtin,
        unit.id,
        unit.serial,
      ].some((value) => value?.toLowerCase().includes(keyword))
    )
      return [];
    return [{ unit, entry, product, batch, identity, association, official }];
  });
}
export type MappingRow = ReturnType<typeof mappingRows>[number];

export function mappingPage<T>(rows: T[], requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, totalPages));
  return { page, totalPages, rows: rows.slice((page - 1) * pageSize, page * pageSize) };
}

export type MappingView = {
  filters: MappingFilters;
  selected: Set<string>;
  page: number;
  pageSize: number;
};
export const initialMappingView = (): MappingView => ({
  filters: emptyMappingFilters,
  selected: new Set(),
  page: 1,
  pageSize: 20,
});
export type MappingAction =
  | { type: "filter"; filters: MappingFilters }
  | { type: "size"; size: number }
  | { type: "page"; page: number }
  | { type: "select"; ids: string[]; checked: boolean }
  | { type: "clear" };
export function mappingViewReducer(view: MappingView, action: MappingAction): MappingView {
  if (action.type === "filter")
    return { ...view, filters: action.filters, page: 1, selected: new Set() };
  if (action.type === "size") return { ...view, pageSize: action.size, page: 1 };
  if (action.type === "page") return { ...view, page: action.page };
  if (action.type === "clear") return { ...view, selected: new Set() };
  const selected = new Set(view.selected);
  for (const id of action.ids) action.checked ? selected.add(id) : selected.delete(id);
  return { ...view, selected };
}

// Delegate the existing identity URI and CSV rules per product/batch scope, then
// add mapping columns with the same CSV library already used by L-006.
export function buildMappingExportCsv(state: DemoState, rows: MappingRow[]) {
  const scopes = new Map<string, MappingRow[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.unit.productId, row.unit.batchId]);
    const scope = scopes.get(key) ?? [];
    scope.push(row);
    scopes.set(key, scope);
  }
  const records: Record<string, string>[] = [];
  for (const scope of scopes.values()) {
    const first = scope[0];
    if (!first?.entry || !first.batch) throw new Error("Invalid mapping export scope");
    const ids = new Set(scope.map((row) => row.unit.id));
    const baseCsv = buildUnitExportCsv(
      { ...state, units: state.units.filter((unit) => ids.has(unit.id)) },
      {
        productId: first.unit.productId,
        batchId: first.unit.batchId,
        baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
        brandSlug: productBrandSlug(first.entry.published ?? first.entry.draft),
      },
    );
    const parsed = Papa.parse<Record<string, string>>(baseCsv, {
      header: true,
      skipEmptyLines: true,
    }).data;
    for (const row of scope) {
      const base = parsed.find((record) => record["serial"] === row.identity?.serial);
      records.push({
        productId: row.unit.productId,
        product: row.product?.name ?? "",
        SKU: row.product?.sku ?? "",
        batchId: row.unit.batchId,
        batch: row.batch?.batchNumber ?? "",
        GTIN: row.identity?.gtin ?? "",
        serial: row.unit.serial,
        unitId: row.unit.id,
        absoluteUri: base?.["absoluteUri"] ?? "",
        officialCodeState: row.official,
        evidence: row.association?.evidence ?? "Simulated",
        externalReference: row.association?.externalReference ?? "",
      });
    }
  }
  return Papa.unparse(
    {
      fields: [
        "productId",
        "product",
        "SKU",
        "batchId",
        "batch",
        "GTIN",
        "serial",
        "unitId",
        "absoluteUri",
        "officialCodeState",
        "evidence",
        "externalReference",
      ],
      data: records,
    },
    { escapeFormulae: true },
  );
}
