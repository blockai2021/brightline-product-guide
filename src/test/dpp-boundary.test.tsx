import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { Dpp } from "@/features/connect/admin";
import { AdminLanguageProvider } from "@/features/connect/language";
import { demoProduct } from "@/features/connect/seed";
import { DemoProvider } from "@/features/connect/store";
import { useDemo } from "@/features/connect/store";

describe("C-008 Connect DPP ownership boundary", () => {
  it("reading DPP statuses does not mutate any product, published snapshot or identity", async () => {
    let before = "";
    let latest = "";
    function Probe() {
      const { state } = useDemo();
      latest = JSON.stringify(state);
      if (!before) before = latest;
      return null;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminLanguageProvider language="en">
          <DemoProvider>
            <Probe />
            <Dpp />
          </DemoProvider>
        </AdminLanguageProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(demoProduct.name)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Manage DPP" })).toBeDisabled());
    expect(latest).toBe(before);
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish product" })).not.toBeInTheDocument();
  });
});
