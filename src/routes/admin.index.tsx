import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () =>
    pageMeta(
      "Dashboard",
      "Products, scans, support and community in the NOVA Home demo workspace.",
    ),
});
