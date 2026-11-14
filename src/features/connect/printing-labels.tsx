import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Plus,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDemo } from "./store";
import { usePrintJobs } from "./printing-store";
import { useAdminTranslation } from "./language";
import { DemoNotice, Field } from "./ui";
import { downloadFile } from "./digital-link-qr";
import {
  cancelPrintJob,
  confirmPrintJob,
  eligiblePrintUnits,
  exportPrintJob,
  preparePrintJob,
  PrintingError,
  PRINT_PDF_LIMIT,
  type PrintJob,
} from "./printing";

export function PrintingLabels({ initialProductId }: { initialProductId?: string }) {
  const { state, ready: demoReady } = useDemo();
  const { jobs, ready, save, storageError } = usePrintJobs();
  const { t, language } = useAdminTranslation();
  const [productId, setProductId] = useState(initialProductId ?? state.products[0]?.draft.id ?? "");
  const [batchId, setBatchId] = useState("");
  const batches = state.batches.filter((b) => b.productId === productId);
  const effectiveBatch = batchId || batches[0]?.id || "";
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unprinted, setUnprinted] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [operator, setOperator] = useState("demo operator");
  const [actualCount, setActualCount] = useState("");
  const [notes, setNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pdfCount, setPdfCount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = state.products.find((p) => p.draft.id === productId);
  const source = jobs.find((j) => j.id === sourceId);
  const confirmed = new Set(
    jobs
      .filter((j) => j.status === "Manually confirmed printed")
      .flatMap((j) => j.rows.map((r) => r.unitId)),
  );
  const units = eligiblePrintUnits(state, productId, effectiveBatch).filter(
    (u) =>
      (!source || source.rows.some((r) => r.unitId === u.id)) &&
      (!unprinted || source || !confirmed.has(u.id)) &&
      `${u.serial} ${u.id}`.toLowerCase().includes(search.toLowerCase()) &&
      (!from || u.serial >= from) &&
      (!to || u.serial <= to),
  );
  const pages = Math.max(1, Math.ceil(units.length / 20));
  const currentPage = Math.min(page, pages);
  const pageUnits = units.slice((currentPage - 1) * 20, currentPage * 20);
  const productJobs = jobs.filter((j) => j.productId === productId);
  const active = productJobs.find((j) => j.id === activeId);
  const date = (value: string) =>
    new Date(value).toLocaleString(
      language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
    );
  function resetSelection() {
    setSelected([]);
    setPage(1);
  }
  function perform(action: () => void) {
    setError("");
    try {
      action();
    } catch (e) {
      setError(t(`Print.error.${e instanceof PrintingError ? e.code : "storage"}`));
    }
  }
  function replace(job: PrintJob) {
    save(jobs.map((j) => (j.id === job.id ? job : j)));
  }
  function open(job: PrintJob) {
    setActiveId(job.id);
    setActualCount(String(job.rows.length));
    setAcknowledged(false);
    setNotes("");
    setPdfCount(String(Math.min(10, job.rows.length)));
    setError("");
  }
  function create() {
    perform(() => {
      const job = preparePrintJob(state, jobs, {
        productId,
        batchId: effectiveBatch,
        unitIds: selected,
        ...(source ? { originalJobId: source.id, reason } : {}),
      });
      save([job, ...jobs]);
      open(job);
      resetSelection();
      setSourceId("");
      setReason("");
    });
  }
  function download(job: PrintJob, file: "data" | "manifest" | "readme") {
    perform(() => {
      if (file === "data") replace(exportPrintJob(job));
      downloadFile(
        new Blob([job.files[file]], {
          type: file === "readme" ? "text/plain;charset=utf-8" : "text/csv;charset=utf-8",
        }),
        `${job.id}-${file === "data" ? "print-data.csv" : file === "manifest" ? "manifest.csv" : "README.txt"}`,
      );
    });
  }
  async function preview(job: PrintJob) {
    setBusy(true);
    setError("");
    try {
      const { createPrintPreview } = await import("./printing-pdf");
      const blob = await createPrintPreview(job, Number(pdfCount));
      downloadFile(blob, `${job.id}-DEMO-preview.pdf`);
    } catch (e) {
      setError(t(`Print.error.${e instanceof PrintingError ? e.code : "pdf"}`));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="printing-page">
      <div className="section-head">
        <div>
          <h1>{t("Print.title")}</h1>
          <p>{t("Print.local")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/products">
            <ChevronLeft />
            {t("Catalog.title")}
          </Link>
        </Button>
      </div>
      <DemoNotice />
      <p className="demo-notice">{t("Print.warning")}</p>
      {(error || storageError) && (
        <p role="alert" className="text-destructive">
          {error || t("Print.error.storage")}
        </p>
      )}
      <section className="py-6 space-y-4">
        <h2 className="text-lg font-semibold">{source ? t("Print.reprint") : t("Print.create")}</h2>
        <div className="print-filters">
          <Field label={t("Product")}>
            <select
              aria-label={t("Product")}
              value={productId}
              disabled={!!source}
              onChange={(e) => {
                setProductId(e.target.value);
                setBatchId("");
                setActiveId("");
                setSourceId("");
                setSearch("");
                setFrom("");
                setTo("");
                resetSelection();
              }}
            >
              {state.products.map((p) => (
                <option value={p.draft.id} key={p.draft.id}>
                  {p.draft.name} · {p.draft.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Production batch")}>
            <select
              aria-label={t("Production batch")}
              value={effectiveBatch}
              disabled={!!source}
              onChange={(e) => {
                setBatchId(e.target.value);
                resetSelection();
              }}
            >
              {!batches.length && <option value="">{t("Print.noBatch")}</option>}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Print.search")}>
            <Input
              aria-label={t("Print.search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetSelection();
              }}
            />
          </Field>
          <Field label={t("Print.from")}>
            <Input
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                resetSelection();
              }}
            />
          </Field>
          <Field label={t("Print.to")}>
            <Input
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                resetSelection();
              }}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={unprinted}
              disabled={!!source}
              onCheckedChange={(v) => {
                setUnprinted(v === true);
                resetSelection();
              }}
            />
            {t("Print.unprinted")}
          </label>
        </div>
        <p className="text-sm text-muted-foreground break-words">
          {product?.published?.brand ?? product?.draft.brand} · {product?.draft.sku} · GTIN{" "}
          {product?.draft.gtin} · {t("Print.range")}
        </p>
        {source && (
          <div className="space-y-3">
            <p className="text-warning break-all">
              {t("Print.reprintWarning")} · {source.id}
            </p>
            <Field label={t("Print.reason")}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                setSourceId("");
                setReason("");
                resetSelection();
              }}
            >
              <X />
              {t("Print.abortReprint")}
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span>{t("Print.count", { count: units.length, selected: selected.length })}</span>
          <Button
            variant="outline"
            disabled={!units.length}
            onClick={() => setSelected(units.map((u) => u.id))}
          >
            {t("Print.selectFiltered")}
          </Button>
          <Button variant="ghost" disabled={!selected.length} onClick={resetSelection}>
            {t("Print.clear")}
          </Button>
          <Button
            disabled={!ready || !demoReady || !selected.length || (!!source && !reason.trim())}
            onClick={create}
          >
            <Plus />
            {source ? t("Print.createReprint") : t("Print.create")}
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <Checkbox
                    aria-label={t("Select current page")}
                    checked={
                      pageUnits.length > 0 && pageUnits.every((u) => selected.includes(u.id))
                    }
                    onCheckedChange={(v) =>
                      setSelected(
                        v === true
                          ? [...new Set([...selected, ...pageUnits.map((u) => u.id)])]
                          : selected.filter((id) => !pageUnits.some((u) => u.id === id)),
                      )
                    }
                  />
                </th>
                <th>{t("Serial")}</th>
                <th>{t("Print.identity")}</th>
                <th>{t("Print.printRecord")}</th>
              </tr>
            </thead>
            <tbody>
              {pageUnits.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Checkbox
                      aria-label={t("Select unit {id}", { id: u.serial })}
                      checked={selected.includes(u.id)}
                      onCheckedChange={(v) =>
                        setSelected(
                          v === true ? [...selected, u.id] : selected.filter((id) => id !== u.id),
                        )
                      }
                    />
                  </td>
                  <td className="font-mono">{u.serial}</td>
                  <td className="text-xs break-all">
                    {state.identities.find((i) => i.unitId === u.id)?.id}
                  </td>
                  <td>
                    {confirmed.has(u.id)
                      ? t("Print.status.Manually confirmed printed")
                      : t("Print.notConfirmed")}
                  </td>
                </tr>
              ))}
              {!units.length && (
                <tr>
                  <td colSpan={4}>{t("Print.noUnits")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3">
          <span>
            {t("{count} results · Page {page} of {pages}", {
              count: units.length,
              page: currentPage,
              pages,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            title={t("Previous page")}
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title={t("Next page")}
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </section>
      <section className="py-6 border-t space-y-4">
        <h2 className="text-lg font-semibold">
          {t("Print.jobs")} · {productJobs.length}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Print.jobId")}</th>
                <th>{t("Production batch")}</th>
                <th>{t("Print.quantity")}</th>
                <th>{t("Status")}</th>
                <th>{t("Print.created")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {productJobs.map((j) => (
                <tr key={j.id}>
                  <td className="text-xs">
                    <strong className="break-all">{j.id}</strong>
                    <small>
                      {j.sku} · {j.brand}
                      {j.originalJobId ? ` · ${t("Print.reprint")}` : ""}
                    </small>
                  </td>
                  <td>{j.batchNumber}</td>
                  <td>{j.rows.length}</td>
                  <td>{t(`Print.status.${j.status}`)}</td>
                  <td>{date(j.createdAt)}</td>
                  <td>
                    <Button variant="outline" size="sm" onClick={() => open(j)}>
                      {t("Print.details")}
                    </Button>
                  </td>
                </tr>
              ))}
              {!productJobs.length && (
                <tr>
                  <td colSpan={6}>{t("Print.noJobs")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {active && (
        <section className="py-6 border-t space-y-4" aria-label={t("Print.details")}>
          <h2 className="text-lg font-semibold break-all">{active.id}</h2>
          <p>
            {t(`Print.status.${active.status}`)} · {active.productName} · {active.sku} ·{" "}
            {active.brand} · {active.batchNumber} · {active.rows.length} · CSV v1
          </p>
          <p className="text-xs break-all">
            {t("Print.digest")}: {active.checksum} · {t("Print.created")}: {date(active.createdAt)}
          </p>
          {active.exportedAt && (
            <p>
              {t("Print.status.Exported")}: {date(active.exportedAt)}
            </p>
          )}
          {active.cancelledAt && (
            <p>
              {t("Print.status.Cancelled")}: {date(active.cancelledAt)}
            </p>
          )}
          {active.originalJobId && (
            <p className="text-warning break-all">
              {t("Print.reprintWarning")} · {active.originalJobId} · {active.reprintReason}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(["data", "manifest", "readme"] as const).map((file) => (
              <Button
                key={file}
                variant="outline"
                disabled={active.status === "Cancelled"}
                onClick={() => download(active, file)}
              >
                <Download />
                {t(`Print.file.${file}`)}
              </Button>
            ))}
            <Button
              variant="outline"
              disabled={active.status === "Cancelled"}
              onClick={() => {
                setSourceId(active.id);
                setBatchId(active.batchId);
                setUnprinted(false);
                setSearch("");
                setFrom("");
                setTo("");
                setSelected(active.rows.map((r) => r.unitId));
                setReason("");
                setPage(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <RotateCcw />
              {t("Print.reprint")}
            </Button>
            <Button
              variant="outline"
              disabled={active.status !== "Prepared" && active.status !== "Exported"}
              onClick={() =>
                perform(() => {
                  if (window.confirm(t("Print.cancelQuestion"))) replace(cancelPrintJob(active));
                })
              }
            >
              <X />
              {t("Print.cancel")}
            </Button>
          </div>
          <div className="print-confirm-grid">
            <div className="space-y-3">
              <h3 className="font-semibold">{t("Print.confirm")}</h3>
              <p className="text-sm text-muted-foreground">{t("Print.manualWarning")}</p>
              {active.confirmation ? (
                <div className="space-y-2">
                  <p>
                    {active.confirmation.operator} · {date(active.confirmation.at)}
                  </p>
                  <p>
                    {t("Print.difference", {
                      planned: active.rows.length,
                      actual: active.confirmation.actualCount,
                      difference: active.confirmation.actualCount - active.rows.length,
                    })}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{active.confirmation.notes}</p>
                </div>
              ) : (
                <>
                  <Field label={t("Print.operator")}>
                    <Input value={operator} onChange={(e) => setOperator(e.target.value)} />
                  </Field>
                  <Field label={t("Print.actual")}>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={actualCount}
                      onChange={(e) => setActualCount(e.target.value)}
                    />
                  </Field>
                  <Field label={t("Print.notes")}>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </Field>
                  {actualCount !== "" && Number(actualCount) !== active.rows.length && (
                    <p className="text-warning">
                      {t("Print.difference", {
                        planned: active.rows.length,
                        actual: actualCount,
                        difference: Number(actualCount) - active.rows.length,
                      })}
                    </p>
                  )}
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={acknowledged}
                      onCheckedChange={(v) => setAcknowledged(v === true)}
                    />
                    {t("Print.acknowledge")}
                  </label>
                  <Button
                    disabled={
                      active.status !== "Exported" ||
                      !acknowledged ||
                      !operator.trim() ||
                      actualCount === ""
                    }
                    onClick={() =>
                      perform(() =>
                        replace(confirmPrintJob(active, operator, Number(actualCount), notes)),
                      )
                    }
                  >
                    <Check />
                    {t("Print.confirm")}
                  </Button>
                </>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">{t("Print.pdf")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Print.pdfWarning", { count: PRINT_PDF_LIMIT })}
              </p>
              <Field label={t("Print.sampleCount")}>
                <Input
                  type="number"
                  min="1"
                  max={Math.min(active.rows.length, PRINT_PDF_LIMIT)}
                  value={pdfCount}
                  onChange={(e) => setPdfCount(e.target.value)}
                />
              </Field>
              <Button
                variant="outline"
                disabled={busy || active.status === "Cancelled"}
                onClick={() => preview(active)}
              >
                <Printer />
                {busy ? t("Print.working") : t("Print.pdf")}
              </Button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("Serial")}</th>
                  <th>GTIN</th>
                  <th>Digital Link</th>
                </tr>
              </thead>
              <tbody>
                {active.rows.slice(0, 20).map((r) => (
                  <tr key={r.unitId}>
                    <td>{r.sequence}</td>
                    <td>{r.serial}</td>
                    <td>{r.gtin}</td>
                    <td className="text-xs break-all">{r.digitalLink}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {active.rows.length > 20 && (
            <p className="text-sm text-muted-foreground">{t("Print.snapshotSample")}</p>
          )}
        </section>
      )}
    </div>
  );
}
