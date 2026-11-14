import { createFileRoute } from "@tanstack/react-router";
import { Marketing } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/marketing")({
  component: Marketing,
  head: () =>
    pageMeta(
      "Marketing & Community",
      "Manage European demo events and independent marketing consent.",
    ),
});
