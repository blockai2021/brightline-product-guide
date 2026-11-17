import type { Campaign, DemoState } from "./domain";

export type CampaignView = "All" | "Active" | "Paused" | "Draft" | "Deleted";
export const campaignViews: CampaignView[] = ["All", "Active", "Paused", "Draft", "Deleted"];

/** Lifecycle view of an event: deleted wins, Published = Active, Closed = Paused. */
export function campaignView(c: Campaign): Exclude<CampaignView, "All"> {
  if (c.deletedAt) return "Deleted";
  return c.status === "Published" ? "Active" : c.status === "Closed" ? "Paused" : "Draft";
}
export function filterCampaigns(list: Campaign[], view: CampaignView): Campaign[] {
  return list.filter((c) =>
    view === "All" ? !c.deletedAt : campaignView(c) === view,
  );
}
export function countCampaigns(list: Campaign[]): Record<CampaignView, number> {
  const out: Record<CampaignView, number> = { All: 0, Active: 0, Paused: 0, Draft: 0, Deleted: 0 };
  for (const c of list) {
    const v = campaignView(c);
    out[v]++;
    if (v !== "Deleted") out.All++;
  }
  return out;
}
const touch = (state: DemoState, ids: string[], fn: (c: Campaign) => Campaign): DemoState => {
  const set = new Set(ids);
  return { ...state, campaigns: state.campaigns.map((c) => (set.has(c.id) ? fn(c) : c)) };
};
/** Activate (publish) non-deleted events. */
export const activateCampaigns = (s: DemoState, ids: string[]) =>
  touch(s, ids, (c) => (c.deletedAt ? c : { ...c, status: "Published" }));
/** Pause only active events. */
export const pauseCampaigns = (s: DemoState, ids: string[]) =>
  touch(s, ids, (c) => (c.deletedAt || c.status !== "Published" ? c : { ...c, status: "Closed" }));
/** Move to Deleted; registrations are kept. */
export const trashCampaigns = (s: DemoState, ids: string[], now: string) =>
  touch(s, ids, (c) => (c.deletedAt ? c : { ...c, deletedAt: now }));
/** Restore from Deleted as paused (or draft) so nothing goes live by accident. */
export const restoreCampaigns = (s: DemoState, ids: string[]) =>
  touch(s, ids, (c) => {
    if (!c.deletedAt) return c;
    const { deletedAt: _d, ...rest } = c;
    return { ...rest, status: c.status === "Draft" ? "Draft" : "Closed" };
  });
/** Permanently remove deleted events and their registrations. */
export function purgeCampaigns(s: DemoState, ids: string[]): DemoState {
  const set = new Set(s.campaigns.filter((c) => c.deletedAt && ids.includes(c.id)).map((c) => c.id));
  return {
    ...s,
    campaigns: s.campaigns.filter((c) => !set.has(c.id)),
    records: s.records.filter((r) => !(r.eventId && set.has(r.eventId))),
  };
}
export const registrationCount = (s: DemoState, ids: string[]) =>
  s.records.filter((r) => r.eventId && ids.includes(r.eventId)).length;
