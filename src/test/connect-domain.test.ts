import { describe, expect, it } from "vitest";
import { initialState, demoProduct } from "@/features/connect/seed";
import {
  publishProduct,
  registerEvent,
  saveDraft,
  setConsent,
  type RecordEntry,
} from "@/features/connect/domain";
describe("Demo business rules", () => {
  it("keeps saved drafts out of the published consumer version", () => {
    const state = saveDraft(initialState(), { ...demoProduct, name: "Draft name" });
    expect(state.products[0]?.published?.name).toBe("AirPure Mini");
    expect(state.products[0]?.draft.name).toBe("Draft name");
  });
  it("publishes the updated name, image, description and manual together", () => {
    const product = {
      ...demoProduct,
      name: "AirPure Updated",
      image: "updated.jpg",
      description: { en: "Updated", de: "Neu", zh: "更新" },
      manual: { en: "Updated manual", de: "Neue Anleitung", zh: "新说明书" },
    };
    const state = publishProduct(initialState(), product);
    expect(state.products[0]?.published).toMatchObject({
      id: "demo-prod-airpure-001",
      name: "AirPure Updated",
      image: "updated.jpg",
      description: product.description,
      manual: product.manual,
    });
  });
  it("does not expose a newly created draft as a published product", () => {
    const state = saveDraft(initialState(), { ...demoProduct, id: "new-unique-id" });
    expect(state.products[1]?.published).toBeUndefined();
    expect(new Set(state.products.map((p) => p.draft.id)).size).toBe(2);
  });
  const record: RecordEntry = {
    id: "test",
    productId: demoProduct.id,
    name: "Demo",
    email: "demo@example.test",
    serial: "",
    date: "2026-11-14",
    kind: "Event",
    details: "",
    status: "New",
    eventId: "demo-event-hamburg",
  };
  it("rejects registrations after an event is closed", () => {
    expect(() => registerEvent(initialState(), record)).toThrow(
      "Event is not accepting registrations",
    );
  });
  it("rejects registrations for draft events", () => {
    expect(() =>
      registerEvent(initialState(), { ...record, eventId: "demo-event-munich" }),
    ).toThrow();
  });
  it("allows published event registration without creating marketing consent", () => {
    const state = initialState();
    const result = registerEvent(state, { ...record, eventId: "demo-event-berlin" });
    expect(result.records[0]?.id).toBe("test");
    expect(result.consents).toEqual(state.consents);
  });
  it("keeps warranty registration separate from marketing authorization", () => {
    const state = initialState();
    const result = {
      ...state,
      records: [{ ...record, kind: "Warranty" as const }, ...state.records],
    };
    expect(result.consents.some((c) => c.email === record.email)).toBe(false);
  });
  it("supports independent marketing withdrawal", () => {
    const state = setConsent(
      setConsent(initialState(), "demo@example.test", true),
      "demo@example.test",
      false,
    );
    expect(state.consents.find((c) => c.email === "demo@example.test")?.active).toBe(false);
    expect(state.consents.filter((c) => c.email === "demo@example.test")).toHaveLength(1);
  });
});
