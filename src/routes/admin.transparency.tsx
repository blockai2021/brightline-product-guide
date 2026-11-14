import { createFileRoute } from "@tanstack/react-router";
import { Transparency } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/transparency")({
  component: Transparency,
  head: () =>
    pageMeta(
      "Product transparency",
      "Demo product identity mappings and official Amazon verification guidance.",
    ),
});
