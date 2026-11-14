import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_SCAN_END,
  demoDailyScans,
  scanWindow,
  scanTicks,
  scanDateLabel,
  shiftScanDate,
} from "@/features/connect/dashboard-analytics";
import { Dashboard } from "@/features/connect/admin";
import { AdminLanguageProvider } from "@/features/connect/language";
import { DemoProvider, useDemo } from "@/features/connect/store";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("L-013 dated Dashboard scan windows", () => {
  beforeEach(() => localStorage.clear());

  it.each([
    {
      days: 7 as const,
      start: "2026-11-08",
      previousStart: "2026-11-01",
      previousEnd: "2026-11-07",
      total: 695,
      previousTotal: 658,
      tickIndices: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      days: 30 as const,
      start: "2026-10-16",
      previousStart: "2026-09-16",
      previousEnd: "2026-10-15",
      total: 2800,
      previousTotal: 2512,
      tickIndices: [0, 5, 10, 15, 20, 25, 29],
    },
    {
      days: 90 as const,
      start: "2026-08-17",
      previousStart: "2026-05-19",
      previousEnd: "2026-08-16",
      total: 7507,
      previousTotal: 4828,
      tickIndices: [0, 15, 30, 45, 60, 75, 89],
    },
  ])("uses $days calendar days and an adjacent equal-length comparison", (rule) => {
    const window = scanWindow(demoDailyScans, rule.days, DEMO_SCAN_END);
    expect(window.current).toHaveLength(rule.days);
    expect(new Set(window.current.map((row) => row.date)).size).toBe(rule.days);
    expect(window.current[0]?.date).toBe(rule.start);
    expect(window.current.at(-1)?.date).toBe("2026-11-14");
    expect(window.previous).toHaveLength(rule.days);
    expect(window.previous[0]?.date).toBe(rule.previousStart);
    expect(window.previous.at(-1)?.date).toBe(rule.previousEnd);
    expect(window.total).toBe(rule.total);
    expect(window.previousTotal).toBe(rule.previousTotal);
    expect(window.changePercent).toBeCloseTo(
      ((rule.total - rule.previousTotal) / rule.previousTotal) * 100,
    );
    const ticks = scanTicks(window.current);
    expect(ticks.map((tick) => tick.index)).toEqual(rule.tickIndices);
    for (const tick of ticks) {
      expect(tick.date).toBe(window.current[tick.index]?.date);
      expect(tick.position).toBe(tick.index / (rule.days - 1));
    }
    const compact = scanTicks(window.current, true);
    expect(compact).toHaveLength(3);
    expect(compact[0]?.date).toBe(rule.start);
    expect(compact.at(-1)?.date).toBe("2026-11-14");
  });

  it("uses UTC days through DST transitions and formats the corresponding date in every locale", () => {
    expect(shiftScanDate("2026-10-25", 1)).toBe("2026-10-26");
    expect(shiftScanDate("2026-03-29", -1)).toBe("2026-03-28");
    expect(scanDateLabel("2026-08-17", "en")).toBe("17 Aug");
    expect(scanDateLabel("2026-08-17", "zh")).toBe("8月17日");
    expect(scanDateLabel("2026-08-17", "de")).toBe("17. Aug.");
  });

  it("does not invent a percentage when the previous period has no scans", () => {
    const window = scanWindow([{ date: "2026-11-14", scans: 10 }], 7, DEMO_SCAN_END);
    expect(window.total).toBe(10);
    expect(window.previousTotal).toBe(0);
    expect(window.changePercent).toBeNull();
  });

  it("switches both controls and summaries without changing repository data", () => {
    let before = "";
    let latest = "";
    function Probe() {
      latest = JSON.stringify(useDemo().state);
      if (!before) before = latest;
      return null;
    }
    render(
      <AdminLanguageProvider language="en">
        <DemoProvider>
          <Probe />
          <Dashboard />
        </DemoProvider>
      </AdminLanguageProvider>,
    );
    const chart = within(screen.getByRole("region", { name: "Product engagement" }));
    expect(chart.getByText("2,800")).toBeInTheDocument();
    expect(chart.getByText("+11.5%")).toBeInTheDocument();
    fireEvent.click(chart.getByRole("button", { name: "7 days" }));
    expect(chart.getByText("695")).toBeInTheDocument();
    expect(chart.getByText("+5.6%")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Reporting period" })).toHaveValue("Last 7 days");
    fireEvent.change(screen.getByRole("combobox", { name: "Reporting period" }), {
      target: { value: "Last 90 days" },
    });
    expect(chart.getByText("7,507")).toBeInTheDocument();
    expect(chart.getByText("+55.5%")).toBeInTheDocument();
    expect(latest).toBe(before);
  });
});
