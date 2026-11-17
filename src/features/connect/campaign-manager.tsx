import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Campaign } from "./domain";
import { useDemo } from "./store";
import { useAdminTranslation } from "./language";
import {
  activateCampaigns, campaignView, campaignViews, countCampaigns, filterCampaigns,
  pauseCampaigns, purgeCampaigns, registrationCount, restoreCampaigns, trashCampaigns,
  type CampaignView,
} from "./campaign-lifecycle";

const label = (v: CampaignView) => (v === "All" ? "All events" : v === "Active" ? "Active event" : v);

export function useCampaignSelection(campaigns: Campaign[]) {
  const [view, setViewState] = useState<CampaignView>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = useMemo(() => filterCampaigns(campaigns, view), [campaigns, view]);
  const counts = useMemo(() => countCampaigns(campaigns), [campaigns]);
  const ids = visible.map((c) => c.id).filter((id) => selected.has(id));
  return {
    view, visible, counts, selected, ids,
    setView: (v: CampaignView) => { setViewState(v); setSelected(new Set()); },
    toggle: (id: string) =>
      setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    toggleAll: () =>
      setSelected(ids.length === visible.length ? new Set() : new Set(visible.map((c) => c.id))),
    clear: () => setSelected(new Set()),
  };
}
type Sel = ReturnType<typeof useCampaignSelection>;

function useActions() {
  const { state, update } = useDemo();
  const { t } = useAdminTranslation();
  return {
    activate: (ids: string[]) => { update((s) => activateCampaigns(s, ids)); toast.success(t("Events activated")); },
    pause: (ids: string[]) => { update((s) => pauseCampaigns(s, ids)); toast.success(t("Events paused. Registrations are disabled.")); },
    trash: (ids: string[]) => {
      if (!window.confirm(t("Move {count} event(s) to Deleted? Registrations are kept.").replace("{count}", String(ids.length)))) return false;
      update((s) => trashCampaigns(s, ids, new Date().toISOString()));
      toast.success(t("Moved to Deleted"));
      return true;
    },
    restore: (ids: string[]) => { update((s) => restoreCampaigns(s, ids)); toast.success(t("Events restored as paused")); },
    purge: (ids: string[]) => {
      const msg = t("Permanently delete {count} event(s) and {regs} registration(s)? This cannot be undone.")
        .replace("{count}", String(ids.length)).replace("{regs}", String(registrationCount(state, ids)));
      if (!window.confirm(msg)) return false;
      update((s) => purgeCampaigns(s, ids));
      toast.success(t("Permanently deleted"));
      return true;
    },
  };
}

export function CampaignViewTabs({ sel }: { sel: Sel }) {
  const { t } = useAdminTranslation();
  return (
    <div className="segmented mb-4 w-fit flex-wrap">
      {campaignViews.map((v) => (
        <Button key={v} variant="ghost" size="sm" className={sel.view === v ? "selected" : ""} onClick={() => sel.setView(v)}>
          {t(label(v))} ({sel.counts[v]})
        </Button>
      ))}
    </div>
  );
}

export function CampaignBulkBar({ sel }: { sel: Sel }) {
  const { t } = useAdminTranslation();
  const a = useActions();
  if (!sel.visible.length) return null;
  const n = sel.ids.length;
  const run = (fn: (ids: string[]) => unknown) => { if (fn(sel.ids) !== false) sel.clear(); };
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border p-2">
      <label className="flex items-center gap-2 text-sm px-2">
        <Checkbox className="size-4 shrink-0 self-center" checked={n > 0 && n === sel.visible.length} onCheckedChange={sel.toggleAll} aria-label={t("Select all")} />
        {n ? t("{count} selected").replace("{count}", String(n)) : t("Select all")}
      </label>
      {n > 0 && (sel.view === "Deleted" ? (
        <>
          <Button size="sm" variant="outline" onClick={() => run(a.restore)}>{t("Restore")}</Button>
          <Button size="sm" variant="destructive" onClick={() => run(a.purge)}>{t("Delete permanently")}</Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={() => run(a.activate)}>{t("Activate")}</Button>
          <Button size="sm" variant="outline" onClick={() => run(a.pause)}>{t("Pause")}</Button>
          <Button size="sm" variant="destructive" onClick={() => run(a.trash)}>{t("Delete")}</Button>
        </>
      ))}
    </div>
  );
}

export function CampaignCardActions({ sel, event, onEdit }: { sel: Sel; event: Campaign; onEdit: () => void }) {
  const { t } = useAdminTranslation();
  const a = useActions();
  const v = campaignView(event);
  return (
    <div className="flex flex-wrap items-center gap-2 mt-5">
      <Checkbox className="size-4 shrink-0 self-center" checked={sel.selected.has(event.id)} onCheckedChange={() => sel.toggle(event.id)} aria-label={t("Select event")} />
      <span className="text-xs font-medium">{t(label(v))}</span>
      {v === "Deleted" ? (
        <>
          <Button variant="outline" size="sm" onClick={() => a.restore([event.id])}>{t("Restore")}</Button>
          <Button variant="destructive" size="sm" onClick={() => a.purge([event.id])}>{t("Delete permanently")}</Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={onEdit}>{t("Edit event")}</Button>
          {v === "Active" && <Button variant="ghost" size="sm" onClick={() => a.pause([event.id])}>{t("Pause")}</Button>}
          {v !== "Active" && <Button variant="ghost" size="sm" onClick={() => a.activate([event.id])}>{t("Activate")}</Button>}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => a.trash([event.id])}>{t("Delete")}</Button>
        </>
      )}
    </div>
  );
}
