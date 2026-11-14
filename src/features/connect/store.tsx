import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  buildDigitalLinkPath,
  isValidAi21Serial,
  normalizeGtin14,
  type DemoState,
  type Product,
  type ProductUnit,
} from "./domain";
import { initialState } from "./seed";
import { PrintJobsProvider } from "./printing-store";
const KEY = "icode-connect-demo-v2";
const LEGACY_KEY = "icode-connect-demo-v1";
type Store = {
  state: DemoState;
  ready: boolean;
  update: (change: (state: DemoState) => DemoState) => void;
};
const Context = createContext<Store | undefined>(undefined);
function isV2(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DemoState>;
  return (
    state.schemaVersion === 2 &&
    Array.isArray(state.products) &&
    Array.isArray(state.contents) &&
    Array.isArray(state.batches) &&
    Array.isArray(state.units) &&
    Array.isArray(state.identities) &&
    Array.isArray(state.transparency) &&
    Array.isArray(state.records) &&
    Array.isArray(state.campaigns) &&
    Array.isArray(state.consents)
  );
}
export function migrateLegacyState(value: unknown): DemoState | null {
  if (isV2(value)) return value;
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (
    !Array.isArray(legacy["products"]) ||
    !Array.isArray(legacy["records"]) ||
    !Array.isArray(legacy["campaigns"]) ||
    !Array.isArray(legacy["consents"])
  )
    return null;
  try {
    const products = legacy["products"].map((entry) => {
      const source = entry as {
        draft: Product & { serial?: string };
        published?: Product & { serial?: string };
      };
      const normalize = (product: Product & { serial?: string }): Product => {
        const { serial: _serial, ...rest } = product;
        const candidate = product.gtin.startsWith("DEMO-") ? product.gtin.slice(5) : product.gtin;
        return {
          ...rest,
          gtin: normalizeGtin14(candidate) || "",
          gtinStatus: product.gtin.startsWith("DEMO-") ? "Demo" : "Format valid · unverified",
        };
      };
      return source.published
        ? { draft: normalize(source.draft), published: normalize(source.published) }
        : { draft: normalize(source.draft) };
    });
    const units: ProductUnit[] = [];
    const unitKeys = new Map<string, string>();
    const batches = products.map((entry) => ({
      id: `legacy-batch-${entry.draft.id}`,
      productId: entry.draft.id,
      batchNumber: "LEGACY-IMPORT",
      status: "Closed" as const,
    }));
    for (const entry of legacy["products"] as Array<{
      draft: Product & { serial?: string };
    }>) {
      const serials = [
        entry.draft.serial,
        ...(legacy["records"] as Array<{ productId?: string; serial?: string }>)
          .filter((record) => record.productId === entry.draft.id)
          .map((record) => record.serial),
      ];
      for (const serial of serials) {
        if (!serial || !isValidAi21Serial(serial)) continue;
        const key = `${entry.draft.id}\u001f${serial}`;
        if (unitKeys.has(key)) continue;
        const id = `legacy-unit-${entry.draft.id}-${units.length + 1}`;
        unitKeys.set(key, id);
        units.push({
          id,
          productId: entry.draft.id,
          batchId: `legacy-batch-${entry.draft.id}`,
          serial,
          status: "Activated",
          createdAt: new Date().toISOString(),
        });
      }
    }
    const identities = units.flatMap((unit) => {
      const product = products.find((entry) => entry.draft.id === unit.productId)?.draft;
      if (!product?.gtin) return [];
      return [
        {
          id: `identity-${unit.id}`,
          unitId: unit.id,
          gtin: product.gtin,
          serial: unit.serial,
          canonicalPath: buildDigitalLinkPath(product.gtin, unit.serial),
          issuedAt: unit.createdAt,
        },
      ];
    });
    const records = (legacy["records"] as DemoState["records"]).map((record) => {
      const unitId = unitKeys.get(`${record.productId}\u001f${record.serial}`);
      return { ...record, ...(unitId ? { unitId } : {}) };
    });
    return {
      schemaVersion: 2,
      products,
      contents: products.flatMap((entry) =>
        entry.published
          ? [
              {
                id: `legacy-content-${entry.draft.id}-1`,
                productId: entry.draft.id,
                version: 1,
                state: "Published" as const,
                description: entry.published.description,
                manual: entry.published.manual,
                faq: entry.published.faq,
                video: entry.published.video,
                createdAt: entry.published.publishedAt || new Date().toISOString(),
                publishedAt: entry.published.publishedAt || new Date().toISOString(),
              },
            ]
          : [],
      ),
      batches,
      units,
      identities,
      transparency: units.map((unit) => ({
        id: `transparency-${unit.id}`,
        unitId: unit.id,
        state: "Not enrolled" as const,
        evidence: "Simulated" as const,
      })),
      records,
      campaigns: legacy["campaigns"] as DemoState["campaigns"],
      consents: legacy["consents"] as DemoState["consents"],
      visits: typeof legacy["visits"] === "number" ? legacy["visits"] : 0,
    };
  } catch {
    return null;
  }
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
        if (!raw) return;
        const value = migrateLegacyState(JSON.parse(raw));
        if (value) {
          setState(value);
          localStorage.setItem(KEY, JSON.stringify(value));
        }
      } catch {
        /* Keep demo seed when storage is unavailable. */
      }
    };
    read();
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === KEY) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function update(change: (state: DemoState) => DemoState) {
    setState((current) => {
      const next = change(current);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* In-memory demo remains usable. */
      }
      return next;
    });
  }
  return (
    <Context.Provider value={{ state, ready, update }}>
      <PrintJobsProvider>{children}</PrintJobsProvider>
    </Context.Provider>
  );
}
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw new Error("DemoProvider required");
  return store;
}
