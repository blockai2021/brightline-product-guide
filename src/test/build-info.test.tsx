import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  buildInfo,
  environmentForHost,
  readBuildInfo,
  versionReport,
} from "@/features/connect/build-info";
import { BuildInfoPanel } from "@/features/connect/build-info-panel";
import { AdminLanguageProvider } from "@/features/connect/language";

describe("Deployment identity integrity", () => {
  it("never substitutes a latest-main SHA when build metadata is absent or malformed", () => {
    expect(readBuildInfo({}).gitSha).toBe("Unknown");
    expect(readBuildInfo({ gitSha: "main" }).gitSha).toBe("Unknown");
    expect(readBuildInfo({ gitSha: "7e47bf2" }).gitSha).toBe("Unknown");
    expect(readBuildInfo({}).builtAt).toBe("Unknown");
    expect(readBuildInfo({ builtAt: "yesterday" }).builtAt).toBe("Unknown");
  });
  it("retains the supplied full build SHA, not a short or replacement commit", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const info = readBuildInfo({
      gitSha: sha,
      version: "V0.1-demo",
      builtAt: "2026-11-15T00:24:00Z",
    });
    expect(info.gitSha).toBe(sha);
    expect(info.builtAt).toBe("2026-11-15T00:24:00.000Z");
    expect(info.deployedAt).toBe("Unknown");
    expect(Object.isFrozen(info)).toBe(true);
  });
  it("uses only known site hosts for the environment, never labels an arbitrary host as published", () => {
    expect(environmentForHost("localhost")).toBe("Development");
    expect(environmentForHost("id-preview--4812f772-7c71-5ddd-8106-387e5238d766.lovable.app")).toBe(
      "Preview",
    );
    expect(
      environmentForHost("id-preview-2--4812f772-7c71-5ddd-8106-387e5238d766.lovable.app"),
    ).toBe("Preview");
    expect(environmentForHost("product-icode-platform.lovable.app")).toBe("Stable Demo");
    expect(environmentForHost("product-icode-platform.lovable.app.evil.test")).toBe("Unknown");
  });
  it.each(["en", "zh", "de"] as const)(
    "copies the complete immutable identity in %s without changing product storage",
    async (language) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
      const before = localStorage.getItem("icode-connect-demo-v2");
      const rendered = render(
        <AdminLanguageProvider language={language}>
          <BuildInfoPanel />
        </AdminLanguageProvider>,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: /^(Copy version information|复制版本信息|Versionsinformationen kopieren)$/,
        }),
      );
      const report = versionReport(
        buildInfo,
        environmentForHost(window.location.hostname),
        language,
        `${window.location.origin}/admin`,
      );
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(report));
      expect(report.split("\n")[3]).toBe(`Git Commit SHA: ${buildInfo.gitSha}`);
      expect(localStorage.getItem("icode-connect-demo-v2")).toBe(before);
      rendered.unmount();
    },
  );
  it("offers the same report for manual copying when clipboard access is denied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    render(
      <AdminLanguageProvider language="en">
        <BuildInfoPanel />
      </AdminLanguageProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy version information" }));
    const report = await screen.findByRole("textbox", { name: "Copy version information" });
    expect((report as HTMLTextAreaElement).value).toBe(
      versionReport(
        buildInfo,
        environmentForHost(window.location.hostname),
        "en",
        `${window.location.origin}/admin`,
      ),
    );
  });
});
