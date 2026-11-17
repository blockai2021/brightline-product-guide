import { describe, expect, it } from "vitest";
import { initialState } from "@/features/connect/seed";
import {
  activateCampaigns, countCampaigns, filterCampaigns, pauseCampaigns,
  purgeCampaigns, restoreCampaigns, trashCampaigns,
} from "@/features/connect/campaign-lifecycle";
import { registerEvent } from "@/features/connect/domain";

const base = () => initialState();
describe("campaign lifecycle", () => {
  it("pauses active events and blocks registration", () => {
    const s = base();
    const id = s.campaigns.find((c) => c.status === "Published")!.id;
    const p = pauseCampaigns(s, [id]);
    expect(p.campaigns.find((c) => c.id === id)!.status).toBe("Closed");
    expect(filterCampaigns(p.campaigns, "Paused").some((c) => c.id === id)).toBe(true);
    expect(() => registerEvent(p, { id: "r", kind: "Event", eventId: id, email: "a@b.c" } as never)).toThrow();
  });
  it("deleted events keep registrations, leave All, and restore as paused", () => {
    const s = base();
    const ids = s.campaigns.map((c) => c.id);
    const before = s.records.length;
    const t = trashCampaigns(s, ids, "2026-11-17T00:00:00Z");
    expect(countCampaigns(t.campaigns).All).toBe(0);
    expect(countCampaigns(t.campaigns).Deleted).toBe(ids.length);
    expect(t.records.length).toBe(before);
    expect(activateCampaigns(t, ids).campaigns).toEqual(t.campaigns);
    const r = restoreCampaigns(t, ids);
    expect(r.campaigns.every((c) => !c.deletedAt && c.status !== "Published")).toBe(true);
  });
  it("purge only removes deleted events and their registrations", () => {
    const s = base();
    const id = s.campaigns[0]!.id;
    expect(purgeCampaigns(s, [id]).campaigns.length).toBe(s.campaigns.length);
    const p = purgeCampaigns(trashCampaigns(s, [id], "x"), [id]);
    expect(p.campaigns.some((c) => c.id === id)).toBe(false);
    expect(p.records.some((r) => r.eventId === id)).toBe(false);
  });
});
