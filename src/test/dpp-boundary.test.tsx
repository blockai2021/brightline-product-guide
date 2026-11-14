import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dpp } from "@/features/connect/admin";
import { AdminLanguageProvider } from "@/features/connect/language";
import { demoProduct } from "@/features/connect/seed";
import { DemoProvider } from "@/features/connect/store";

describe("C-008 Connect DPP ownership boundary", () => {
  it("keeps legacy Connect master fields read-only and exposes no DPP save or publish action", () => {
    render(
      <AdminLanguageProvider language="en">
        <DemoProvider>
          <Dpp />
        </DemoProvider>
      </AdminLanguageProvider>,
    );

    for (const value of [demoProduct.manufacturer, demoProduct.materials, demoProduct.specs]) {
      expect(screen.getByDisplayValue(value)).toHaveAttribute("readonly");
    }
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish product" })).not.toBeInTheDocument();
  });
});

