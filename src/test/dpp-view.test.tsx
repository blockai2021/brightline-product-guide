import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DppStatusPage } from "@/features/connect/dpp-status";
import { AdminLanguageProvider } from "@/features/connect/language";
import { DemoProvider } from "@/features/connect/store";
import { demoProduct, initialState } from "@/features/connect/seed";
import { configuredDppLink, createConnectDppDemoAdapter } from "@/features/connect/dpp-view";
import {
  createDemoDppStatusAdapter,
  DPP_DEMO_LABEL,
  dppBusinessStatusV1Schema,
  type DppStatusResultV1,
} from "@/features/connect/dpp-contracts";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("L-012 read-only DPP integration", () => {
  it("does not invent a link without a configured target", () => {
    expect(configuredDppLink(demoProduct.id, {})).toEqual({
      href: undefined,
      reason: "Dpp.noTarget",
    });
  });
  it("requires an explicit allowed origin and uses productId, never SKU", () => {
    const config = {
      baseUrl: "https://dpp.example.org",
      allowedOrigins: "https://dpp.example.org",
    };
    expect(configuredDppLink("product/id?x=1", config).href).toBe(
      "https://dpp.example.org/products/product%2Fid%3Fx%3D1",
    );
    expect(configuredDppLink(demoProduct.id, { baseUrl: config.baseUrl }).href).toBeUndefined();
    expect(
      configuredDppLink(demoProduct.id, { ...config, baseUrl: "https://other.example.org" }).href,
    ).toBeUndefined();
  });
  it("new products have NOT_STARTED with no made-up update date and preserve domain state", async () => {
    const state = initialState();
    state.products.push({ draft: { ...demoProduct, id: "new-product" } });
    const before = structuredClone(state);
    const adapter = createConnectDppDemoAdapter(state.products);
    expect(await adapter.getStatus("new-product")).toMatchObject({
      ok: true,
      data: { productId: "new-product", status: "NOT_STARTED", updatedAt: null },
    });
    expect(state).toEqual(before);
    expect(adapter.cacheMaxAgeSeconds).toBe(60);
  });
  it("renders all five business states and distinguishes 401/403/404/503 using C-008 results", async () => {
    const keys = [
      ...dppBusinessStatusV1Schema.options,
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "UNAVAILABLE",
    ];
    const state = initialState();
    state.products = keys.map((key) => ({
      draft: { ...demoProduct, id: `p-${key}`, name: `Product ${key}` },
    }));
    localStorage.setItem("icode-connect-demo-v2", JSON.stringify(state));
    const results: DppStatusResultV1[] = [];
    for (const [index, key] of dppBusinessStatusV1Schema.options.entries()) {
      const productId = `p-${key}`;
      const adapter = createDemoDppStatusAdapter({
        session: { authenticated: true, tenantId: "tenant" },
        products: [
          {
            productId,
            tenantId: "tenant",
            masterDataVersion: 1,
            updatedAt: "2026-11-14T12:00:00Z",
          },
        ],
        statuses:
          key === "NOT_STARTED"
            ? []
            : [
                {
                  schemaVersion: "1.0",
                  productId,
                  tenantId: "tenant",
                  profileId: `profile-${index}`,
                  status: key,
                  readiness: {
                    completed: 30,
                    required: 30,
                    percentage: 100,
                    calculationVersion: "1",
                  },
                  template: { id: "template", version: "1", jurisdiction: "EU", sector: "example" },
                  updatedAt: "2026-11-14T12:00:00Z",
                },
              ],
      });
      results.push(await adapter.getStatus(productId));
    }
    for (const error of [
      { code: "UNAUTHENTICATED", httpStatus: 401 },
      { code: "FORBIDDEN", httpStatus: 403 },
      { code: "NOT_FOUND", httpStatus: 404 },
      { code: "UNAVAILABLE", httpStatus: 503, reason: "TIMEOUT" },
    ] as const)
      results.push({ ok: false, integration: "DEMO_MOCK", demoLabel: DPP_DEMO_LABEL, error });
    const adapter = {
      integration: "DEMO_MOCK" as const,
      cacheMaxAgeSeconds: 60,
      getStatuses: async () => results,
      getStatus: async () => results[0] ?? Promise.reject(new Error("No result")),
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminLanguageProvider language="en">
          <DemoProvider>
            <DppStatusPage adapter={adapter} />
          </DemoProvider>
        </AdminLanguageProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(10));
    await waitFor(() => expect(screen.getByText("503 · Request timed out")).toBeInTheDocument());
    for (const label of [
      "Not started",
      "In progress",
      "In review",
      "Ready · internal",
      "Needs update",
      "Sign-in required",
      "Access denied",
      "Product not found",
      "Unavailable",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    fireEvent.change(screen.getByRole("combobox", { name: "DPP status" }), {
      target: { value: "FORBIDDEN" },
    });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Product FORBIDDEN")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "DPP status" }), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Search products" }), {
      target: { value: "p-READY" },
    });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Manage DPP" })).toBeDisabled();
  });
});
