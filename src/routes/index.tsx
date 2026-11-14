import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Connected product workspace",
      "Product iCode Connect demo workspace for connected products in Germany and the EU.",
    ),
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
