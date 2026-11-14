import { createFileRoute } from "@tanstack/react-router";
import { Consumer } from "@/features/connect/consumer";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/p/$slug")({
  component: ProductPage,
  head: ({ params }) =>
    pageMeta(
      params.slug === "airpure-mini" ? "NOVA Home AirPure Mini" : "NOVA Home product",
      "Your connected product home: multilingual guides, demo warranty, support and European community.",
    ),
});
function ProductPage() {
  const { slug } = Route.useParams();
  return <Consumer slug={slug} />;
}
