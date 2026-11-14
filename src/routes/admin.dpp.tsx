import { createFileRoute } from "@tanstack/react-router";
import { Dpp } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/dpp")({
  component: Dpp,
  head: () =>
    pageMeta(
      "DPP Ready",
      "Demonstration of future product passport information; not statutory compliance.",
    ),
});
