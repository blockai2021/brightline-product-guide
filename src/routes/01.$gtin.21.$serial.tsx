import { createFileRoute } from "@tanstack/react-router";
import { Consumer } from "@/features/connect/consumer";
import { pageMeta } from "@/features/connect/meta";

export const Route = createFileRoute("/01/$gtin/21/$serial")({
  component: UnitIdentityPage,
  head: () =>
    pageMeta(
      "Connected product identity",
      "Resolve a demo GS1 Digital Link identity to its published product experience.",
    ),
});

function UnitIdentityPage() {
  const { gtin, serial } = Route.useParams();
  return <Consumer gtin={gtin} identitySerial={serial} />;
}
