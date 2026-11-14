export type Locale = "en" | "de" | "zh";
export type Localized = Record<Locale, string>;
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  sku: string;
  gtin: string;
  asin: string;
  serial: string;
  image: string;
  description: Localized;
  manual: Localized;
  video: string;
  faq: Localized;
  manufacturer: string;
  materials: string;
  specs: string;
  publishedAt?: string;
};
export type ProductEntry = { draft: Product; published?: Product };
export type Campaign = {
  id: string;
  title: Localized;
  city: string;
  date: string;
  description: Localized;
  status: "Draft" | "Published" | "Closed";
};
export type RecordEntry = {
  id: string;
  productId: string;
  name: string;
  email: string;
  serial: string;
  date: string;
  kind: "Warranty" | "Support" | "Event";
  details: string;
  status: "New" | "In progress" | "Resolved";
  eventId?: string;
};
export type Consent = { email: string; active: boolean; updatedAt: string };
export type DemoState = {
  products: ProductEntry[];
  campaigns: Campaign[];
  records: RecordEntry[];
  consents: Consent[];
  visits: number;
};
export function publishProduct(state: DemoState, product: Product): DemoState {
  const snapshot = {
    ...product,
    description: { ...product.description },
    manual: { ...product.manual },
    faq: { ...product.faq },
    publishedAt: new Date().toISOString(),
  };
  return {
    ...state,
    products: state.products.map((p) =>
      p.draft.id === product.id ? { draft: product, published: snapshot } : p,
    ),
  };
}
export function saveDraft(state: DemoState, product: Product): DemoState {
  const exists = state.products.some((p) => p.draft.id === product.id);
  return {
    ...state,
    products: exists
      ? state.products.map((p) => (p.draft.id === product.id ? { ...p, draft: product } : p))
      : [...state.products, { draft: product }],
  };
}
export function registerEvent(state: DemoState, record: RecordEntry): DemoState {
  const event = state.campaigns.find((e) => e.id === record.eventId);
  if (!event || event.status !== "Published")
    throw new Error("Event is not accepting registrations");
  if (
    state.records.some(
      (r) => r.kind === "Event" && r.eventId === record.eventId && r.email === record.email,
    )
  )
    throw new Error("Already registered");
  return { ...state, records: [record, ...state.records] };
}
export function setConsent(state: DemoState, email: string, active: boolean): DemoState {
  return {
    ...state,
    consents: [
      ...state.consents.filter((c) => c.email !== email),
      { email, active, updatedAt: new Date().toISOString() },
    ],
  };
}
