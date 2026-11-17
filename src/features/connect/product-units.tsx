import { useEffect, useState } from "react";
import { Copy, Download, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "./store";
import { useAdminTranslation } from "./language";
import { Field, TextField } from "./ui";
import {
  buildBrandedDigitalLinkUri,
  buildUnitExportCsv,
  createProductUnits,
  findBatchByNumber,
  generateSerialCandidates,
  DEMO_DIGITAL_LINK_BASE_URL,
  type CreateProductUnitsResult,
  type Product,
} from "./domain";
import {
  createQrArtifacts,
  downloadFile,
  parseSerialCsv,
  productBrandSlug,
  unitFileName,
} from "./digital-link-qr";

export function ProductUnits({ productId, mode }: { productId: string; mode: "units" | "links" }) {
  const { state, update } = useDemo();
  const { t } = useAdminTranslation();
  const entry = state.products.find((p) => p.draft.id === productId);
  const product = entry?.draft;
  const brandSlug = entry ? productBrandSlug(entry.published ?? entry.draft) : "";
  const batches = state.batches.filter((b) => b.productId === productId);
  const [batchId, setBatchId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [query, setQuery] = useState("");
  const [prefix, setPrefix] = useState("UNIT");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState("10");
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<CreateProductUnitsResult>();
  const [error, setError] = useState("");
  const conflict = findBatchByNumber(state.batches, batchNumber);
  const conflictProduct = conflict
    ? state.products.find((p) => p.draft.id === conflict.productId)?.draft.name
    : undefined;
  const activeBatchId = batches.some((b) => b.id === batchId) ? batchId : (batches[0]?.id ?? "");
  const units = state.units.filter(
    (u) =>
      u.productId === productId &&
      u.batchId === activeBatchId &&
      `${u.serial} ${u.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = units.find((u) => u.id === selectedId);
  const identity = selected ? state.identities.find((i) => i.unitId === selected.id) : undefined;
  let uri = "";
  let uriError = "";
  if (selected) {
    if (!identity) uriError = t("No issued identity for this unit.");
    else
      try {
        uri = buildBrandedDigitalLinkUri({
          baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
          brandSlug,
          gtin: identity.gtin,
          serial: identity.serial,
        });
      } catch {
        uriError = t("Invalid brand or Digital Link configuration.");
      }
  }
  function create(serials: string[]) {
    setError("");
    try {
      const next = createProductUnits(state, { productId, batchId: activeBatchId, serials });
      if (next.created.length) update(() => next.state);
      setResult(next);
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === "INVALID_GTIN"
            ? "Enter a GTIN with a valid check digit before creating units."
            : "Select a product and one of its batches.",
        ),
      );
    }
  }
  function generate() {
    const candidates = generateSerialCandidates({
      prefix,
      start: Number(start),
      count: Number(count),
    });
    if (!candidates.ok) {
      setError(t(candidates.message));
      setResult(undefined);
      return;
    }
    create(candidates.serials);
  }
  async function importCsv(file?: File) {
    if (!file) return;
    try {
      create(parseSerialCsv(await file.text()));
    } catch {
      setError(t("Invalid serial CSV"));
    }
  }
  function exportCsv() {
    try {
      // The core exporter remains responsible for association and escaping; filter only the requested scope.
      const csv = buildUnitExportCsv(
        { ...state, units },
        { productId, batchId: activeBatchId, baseUrl: DEMO_DIGITAL_LINK_BASE_URL, brandSlug },
      );
      downloadFile(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `${unitFileName(product?.sku ?? "", batches.find((b) => b.id === activeBatchId)?.batchNumber ?? "batch")}.csv`,
      );
    } catch {
      setError(t("Invalid brand or Digital Link configuration."));
    }
  }
  if (!product) return <p role="alert">{t("Select a product and one of its batches.")}</p>;
  return (
    <div className="grid gap-5 min-w-0">
      <div className="form-grid">
        <Field label={t("Production batch")}>
          <select
            className="select-control"
            value={activeBatchId}
            onChange={(e) => {
              setBatchId(e.target.value);
              setSelectedId("");
              setResult(undefined);
            }}
          >
            {!batches.length && (
              <option value="">{t("Select a product and one of its batches.")}</option>
            )}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber}
              </option>
            ))}
          </select>
        </Field>
        <TextField label={t("Search serial or Unit ID")} value={query} onChange={setQuery} />
      </div>
      {mode === "units" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              label={t("New batch number")}
              value={batchNumber}
              onChange={setBatchNumber}
            />
            <Button
              variant="outline"
              disabled={!batchNumber.trim() || !!conflict}
              onClick={() => {
                if (findBatchByNumber(state.batches, batchNumber)) {
                  toast.error(t("This batch number already exists."));
                  return;
                }
                const id = `demo-batch-${crypto.randomUUID()}`;
                update((s) => ({
                  ...s,
                  batches: [
                    ...s.batches,
                    { id, productId, batchNumber: batchNumber.trim(), status: "Draft" },
                  ],
                }));
                setBatchId(id);
                setBatchNumber("");
                setSelectedId("");
                setResult(undefined);
              }}
            >
              <Plus />
              {t("Create batch")}
            </Button>
          </div>
          {conflict && (
            <p className="text-sm text-destructive" role="alert">
              {conflict.productId === productId
                ? t("This product already has this batch.")
                : t("This batch number is already used by another product ({name}).").replace(
                    "{name}",
                    conflictProduct ?? conflict.productId,
                  )}{" "}
              {conflict.productId === productId && (
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setBatchId(conflict.id);
                    setBatchNumber("");
                    setSelectedId("");
                    setResult(undefined);
                  }}
                >
                  {t("Select existing batch")}
                </button>
              )}
            </p>
          )}
          <div className="form-grid">
            <TextField
              label={t("Quantity (1–1000)")}
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={setCount}
            />
            <TextField label={t("Serial prefix")} value={prefix} onChange={setPrefix} />
            <TextField
              label={t("Starting number")}
              type="number"
              min={0}
              value={start}
              onChange={setStart}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!activeBatchId} onClick={generate}>
              <Plus />
              {t("Generate units")}
            </Button>
            <label className="file-control">
              {t("Import serial CSV")}
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={!activeBatchId}
                onChange={(e) => {
                  void importCsv(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {result && (
            <div role="status" className="grid gap-2 text-sm">
              <strong>
                {t("{created} created · {rejected} rejected", {
                  created: result.created.length,
                  rejected: result.rejected.length,
                })}
              </strong>
              {result.created.slice(0, 3).map((u) => (
                <span key={u.id}>
                  {u.serial} · {u.id}
                </span>
              ))}
              {result.rejected.slice(0, 3).map((r) => (
                <span key={r.index}>
                  {r.serial} · {t(r.reason)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {mode === "links" && (
        <p className="demo-notice">
          {t(
            "Demo links use .example and cannot be used as production labels. Not deployed; data stays in this browser.",
          )}
        </p>
      )}
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong>{t("{count} units", { count: units.length })}</strong>
        <Button variant="outline" disabled={!units.length} onClick={exportCsv}>
          <Download />
          {t("Export filtered CSV")}
        </Button>
      </div>
      <div className="table-wrap unit-table">
        <table>
          <thead>
            <tr>
              <th>{t("Serial number")}</th>
              <th>Unit ID</th>
              <th>{t("Status")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td>{u.serial}</td>
                <td>{u.id}</td>
                <td>{t(u.status)}</td>
                <td>
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(u.id)}>
                    <QrCode />
                    {t("View QR")}
                  </Button>
                </td>
              </tr>
            ))}
            {!units.length && (
              <tr>
                <td colSpan={4}>{t("No matching units.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="grid gap-3 min-w-0">
          <dl className="publishing-details">
            <div>
              <dt>{t("Product")}</dt>
              <dd>
                {product.name} · {product.sku}
              </dd>
            </div>
            <div>
              <dt>{t("Production batch")}</dt>
              <dd>{batches.find((b) => b.id === selected.batchId)?.batchNumber}</dd>
            </div>
            <div>
              <dt>GTIN / Serial</dt>
              <dd className="break-all">
                {identity?.gtin} / {selected.serial}
              </dd>
            </div>
          </dl>
          {uriError ? (
            <p role="alert" className="text-destructive">
              {uriError}
            </p>
          ) : (
            <UnitQr key={uri} uri={uri} product={product} serial={selected.serial} />
          )}
        </div>
      )}
    </div>
  );
}

function UnitQr({ uri, product, serial }: { uri: string; product: Product; serial: string }) {
  const { t } = useAdminTranslation();
  const [artifacts, setArtifacts] = useState<Awaited<ReturnType<typeof createQrArtifacts>>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    createQrArtifacts(uri)
      .then((value) => {
        if (!cancelled) setArtifacts(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);
  return (
    <div className="grid gap-3 justify-items-start min-w-0">
      <code className="break-all text-sm" data-testid="unit-uri">
        {uri}
      </code>
      {failed ? (
        <p role="alert">{t("QR generation failed.")}</p>
      ) : artifacts ? (
        <img src={artifacts.png} width={256} height={256} alt={t("Unit QR code")} />
      ) : (
        <p role="status">{t("Generating QR…")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(uri);
              toast.success(t("Link copied"));
            } catch {
              toast.error(t("Unable to copy link."));
            }
          }}
        >
          <Copy />
          {t("Copy link")}
        </Button>
        <Button
          variant="outline"
          disabled={!artifacts}
          onClick={() => {
            if (!artifacts) return;
            const [metadata, body] = artifacts.png.split(",");
            if (!metadata || !body) return;
            const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
            downloadFile(
              new Blob([bytes], { type: "image/png" }),
              `${unitFileName(product.sku, serial)}.png`,
            );
          }}
        >
          <Download />
          {t("Download PNG")}
        </Button>
        <Button
          variant="outline"
          disabled={!artifacts}
          onClick={() => {
            if (artifacts)
              downloadFile(
                new Blob([artifacts.svg], { type: "image/svg+xml" }),
                `${unitFileName(product.sku, serial)}.svg`,
              );
          }}
        >
          <Download />
          {t("Download SVG")}
        </Button>
      </div>
    </div>
  );
}
