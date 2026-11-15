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
import { createBuildStamp, demoMetadataDefines } from "../../build/demo-metadata";

describe("Deployment identity integrity", () => {
  it("creates unique identities even when two builds start at the same instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T00:38:00Z"));
    try {
      const first = createBuildStamp();
      const second = createBuildStamp();
      expect(first.builtAt).toBe("2026-11-15T00:38:00.000Z");
      expect(second.builtAt).toBe(first.builtAt);
      expect(second.buildId).not.toBe(first.buildId);
      expect(Object.isFrozen(first)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps one build identity and clock through repeated bundle definitions and copy reports", () => {
    const stamp = createBuildStamp();
    const first = demoMetadataDefines(
      { VITE_BUILD_TIME: "2020-01-01T00:00:00Z" },
      "build",
      stamp.builtAt,
      stamp.buildId,
    );
    expect(demoMetadataDefines({}, "build", stamp.builtAt, stamp.buildId)).toEqual(first);
    const info = readBuildInfo({
      builtAt: JSON.parse(first["import.meta.env.VITE_BUILD_TIME"] || "null"),
      buildId: JSON.parse(first["import.meta.env.VITE_BUILD_ID"] || "null"),
    });
    expect(info.buildId).toBe(stamp.buildId);
    expect(info.builtAt).toBe(stamp.builtAt);
    for (const locale of ["en", "zh", "de"] as const) {
      expect(
        versionReport(
          info,
          "Stable Demo",
          locale,
          "https://product-icode-platform.lovable.app/admin",
        ),
      ).toContain(`Build ID: ${stamp.buildId}`);
    }
    expect(readBuildInfo({}).buildId).toBe("Unknown");
    expect(
      JSON.parse(
        demoMetadataDefines({}, "serve", stamp.builtAt, stamp.buildId)[
          "import.meta.env.VITE_BUILD_ID"
        ] || "null",
      ),
    ).toBe("");
  });
  it("recognizes the exact formal domain regardless of DNS case or terminal dot", () => {
    expect(environmentForHost("PRODUCT-ICODE-PLATFORM.LOVABLE.APP.")).toBe("Stable Demo");
    expect(environmentForHost("product-icode-platform.lovable.app")).toBe("Stable Demo");
    expect(environmentForHost("www.product-icode-platform.lovable.app")).toBe("Unknown");
  });
  it("recognizes main and draft previews without trusting lookalike domains", () => {
    expect(environmentForHost("id-preview--4812f772-7c71-5ddd-8106-387e5238d766.lovable.app")).toBe(
      "Preview",
    );
    expect(
      environmentForHost("id-preview-12--4812f772-7c71-5ddd-8106-387e5238d766.lovable.app"),
    ).toBe("Preview");
    expect(environmentForHost("id-preview--4812f772.lovable.app.evil.test")).toBe("Unknown");
  });
  it("injects the build clock without inventing a commit or deploy time", () => {
    const defines = demoMetadataDefines({}, "build", "2026-11-15T00:34:00.000Z");
    expect(JSON.parse(defines["import.meta.env.VITE_APP_GIT_SHA"] || "null")).toBe("");
    expect(JSON.parse(defines["import.meta.env.VITE_BUILD_TIME"] || "null")).toBe(
      "2026-11-15T00:34:00.000Z",
    );
    expect(JSON.parse(defines["import.meta.env.VITE_DEPLOY_TIME"] || "null")).toBe("");
    expect(readBuildInfo({}).deployedAt).toBe("Unknown");
    expect(
      JSON.parse(
        demoMetadataDefines({}, "serve", "2026-11-15T00:34:00Z")[
          "import.meta.env.VITE_BUILD_TIME"
        ] || "null",
      ),
    ).toBe("");
  });
  it("preserves explicit pipeline metadata instead of replacing it with build or main values", () => {
    const supplied = {
      VITE_APP_GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
      VITE_BUILD_TIME: "2026-11-15T00:30:00Z",
      VITE_DEPLOY_TIME: "2026-11-15T00:31:00Z",
    };
    const defines = demoMetadataDefines(supplied, "build", "2026-11-15T00:34:00Z");
    for (const [key, value] of Object.entries(supplied)) {
      expect(JSON.parse(defines[`import.meta.env.${key}`] || "null")).toBe(value);
    }
  });
  it("rejects timezone-less times rather than silently depending on the browser timezone", () => {
    expect(
      readBuildInfo({ builtAt: "2026-11-15T00:34:00", deployedAt: "2026-11-15" }).builtAt,
    ).toBe("Unknown");
    expect(readBuildInfo({ deployedAt: "2026-11-15T01:34:00+01:00" }).deployedAt).toBe(
      "2026-11-15T00:34:00.000Z",
    );
  });
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
