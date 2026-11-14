import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDemo } from "./store";
import { useAdminTranslation } from "./language";
import { Field } from "./ui";
import { downloadFile } from "./digital-link-qr";
import {
  PRODUCT_IMPORT_CSV_TEMPLATE,
  PRODUCT_IMPORT_TEMPLATE_COLUMNS,
  ProductImportError,
  parseProductCsv,
  parseProductXlsx,
  previewProductImport,
  applyProductImport,
  serializeProductImportResultCsv,
  type ProductImportField,
  type ProductImportMode,
  type ProductImportTable,
  type ProductImportPlan,
  type ProductImportApplyResult,
} from "./product-import";
import {
  importLimitError,
  suggestProductMapping,
  validateProductMapping,
} from "./product-catalog-tools";

export function downloadProductTemplate() {
  downloadFile(
    new Blob([PRODUCT_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }),
    "product-template.csv",
  );
}

const steps = ["upload", "mapping", "preview", "confirm", "results"] as const;
const actions = ["create", "update", "skip", "conflict", "error"] as const;
// These are the optional fields supported by C-007's explicit clear mechanism.
const clearable = PRODUCT_IMPORT_TEMPLATE_COLUMNS.filter(
  (field) => !["externalProductId", "sku", "brand", "name"].includes(field),
);

export function ProductImportWizard({ onClose }: { onClose: () => void }) {
  const { t } = useAdminTranslation();
  const { state, update, ready } = useDemo();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<(typeof steps)[number]>("upload");
  const [table, setTable] = useState<ProductImportTable>();
  const [fileName, setFileName] = useState("");
  const [workbook, setWorkbook] = useState<ArrayBuffer>();
  const [sheetName, setSheetName] = useState("");
  const [mapping, setMapping] = useState<Record<string, ProductImportField>>({});
  const [mode, setMode] = useState<ProductImportMode>("upsert");
  const [clearFields, setClearFields] = useState<ProductImportField[]>([]);
  const [plan, setPlan] = useState<ProductImportPlan>();
  const [result, setResult] = useState<ProductImportApplyResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(1);
  const [rowFilter, setRowFilter] = useState("");

  function reportError(cause: unknown) {
    setError(cause instanceof ProductImportError ? `Import.${cause.code}` : "Import.failed");
  }
  function acceptTable(next: ProductImportTable) {
    const limit = importLimitError(0, next.rows.length);
    if (limit) {
      setError(limit);
      return;
    }
    if (!next.rows.length) {
      setError("Import.noRows");
      return;
    }
    setTable(next);
    setMapping(suggestProductMapping(next.headers));
    setClearFields([]);
    setError("");
    setStep("mapping");
  }
  async function upload(file?: File) {
    if (!file) return;
    setTable(undefined);
    setWorkbook(undefined);
    setSheetName("");
    setError("");
    const limit = importLimitError(file.size);
    if (limit) {
      setError(limit);
      return;
    }
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setError("Import.fileType");
      return;
    }
    setBusy(true);
    setFileName(file.name);
    try {
      if (extension === "csv") acceptTable(parseProductCsv(await file.text()));
      else {
        const bytes = await file.arrayBuffer();
        setWorkbook(bytes);
        acceptTable(parseProductXlsx(bytes));
      }
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function preview() {
    if (!table || !validateProductMapping(table, mapping)) {
      setError("Import.mappingRequired");
      return;
    }
    try {
      setPlan(previewProductImport(state, table, { mode, fieldMapping: mapping, clearFields }));
      setPage(1);
      setRowFilter("");
      setError("");
      setConfirmed(false);
      setStep("preview");
    } catch (cause) {
      reportError(cause);
    }
  }
  function apply() {
    if (!plan || !confirmed || !ready) return;
    try {
      // No asynchronous gap: apply against the latest render state, then persist once.
      const applied = applyProductImport(state, plan, { confirmed: true });
      update(() => applied.state);
      setResult(applied);
      setError("");
      setPage(1);
      setRowFilter("");
      setStep("results");
    } catch (cause) {
      reportError(cause);
      setConfirmed(false);
    }
  }
  const report = step === "results" ? result : plan;
  const rows = report?.rows.filter((row) => !rowFilter || row.action === rowFilter) ?? [];
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const successful = (report?.counts.create ?? 0) + (report?.counts.update ?? 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="import-dialog" closeLabel={t("Close")}>
        <DialogTitle>{t("Import.title")}</DialogTitle>
        <DialogDescription>{t("Import.localNotice")}</DialogDescription>
        <ol className="import-steps" aria-label={t("Import.progress")}>
          {steps.map((value, index) => (
            <li
              key={value}
              aria-current={step === value ? "step" : undefined}
              className={step === value ? "active" : ""}
            >
              <span>{index + 1}</span>
              {t(`Import.${value}`)}
            </li>
          ))}
        </ol>
        <div className="import-body">
          {error && (
            <p role="alert" className="text-destructive">
              {t(error)}
            </p>
          )}
          {step === "upload" && (
            <div className="grid gap-5">
              <div className="import-upload">
                <FileSpreadsheet size={36} />
                <h3>{t("Import.uploadTitle")}</h3>
                <p>{t("Import.limits")}</p>
                <Button disabled={busy} onClick={() => fileInput.current?.click()}>
                  <Upload />
                  {t(busy ? "Import.reading" : "Import.chooseFile")}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,.xlsx"
                  className="sr-only"
                  aria-label={t("Import.chooseFile")}
                  onChange={(event) => void upload(event.target.files?.[0])}
                />
              </div>
              <Button variant="outline" onClick={downloadProductTemplate}>
                <Download />
                {t("Catalog.template")}
              </Button>
              {workbook && (
                <div className="grid gap-3">
                  <Field label={t("Import.sheetName")}>
                    <Input
                      value={sheetName}
                      onChange={(event) => setSheetName(event.target.value)}
                    />
                  </Field>
                  <Button
                    disabled={!sheetName.trim()}
                    variant="outline"
                    onClick={() => {
                      try {
                        acceptTable(parseProductXlsx(workbook, { sheetName: sheetName.trim() }));
                      } catch (cause) {
                        reportError(cause);
                      }
                    }}
                  >
                    {t("Import.loadSheet")}
                  </Button>
                </div>
              )}
            </div>
          )}
          {step === "mapping" && table && (
            <div className="grid gap-5">
              <p className="break-all">
                {fileName} · {t("Import.rowCount", { count: table.rows.length })}
              </p>
              <Field label={t("Import.strategy")}>
                <select
                  className="select-control"
                  aria-label={t("Import.strategy")}
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ProductImportMode)}
                >
                  {(["create-only", "update-only", "upsert"] as const).map((value) => (
                    <option key={value} value={value}>
                      {t(`Import.${value}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-muted-foreground">{t("Import.blankNotice")}</p>
              <div className="table-wrap import-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Import.source")}</th>
                      <th>{t("Import.sample")}</th>
                      <th>{t("Import.target")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.headers.filter(Boolean).map((header) => (
                      <tr key={header}>
                        <td>{header}</td>
                        <td>{table.rows[0]?.values[header] || "—"}</td>
                        <td>
                          <select
                            className="select-control"
                            aria-label={t("Import.mapColumn", { column: header })}
                            value={mapping[header] ?? ""}
                            onChange={(event) => {
                              const next = { ...mapping };
                              const value = event.target.value;
                              const field = PRODUCT_IMPORT_TEMPLATE_COLUMNS.find(
                                (candidate) => candidate === value,
                              );
                              if (field) next[header] = field;
                              else delete next[header];
                              setMapping(next);
                            }}
                          >
                            <option value="">{t("Import.ignore")}</option>
                            {PRODUCT_IMPORT_TEMPLATE_COLUMNS.map((field) => (
                              <option key={field} value={field}>
                                {t(`Import.field.${field}`)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>{t("Import.clearTitle")}</summary>
                <p className="my-3 text-muted-foreground">{t("Import.clearNotice")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clearable
                    .filter((field) => Object.values(mapping).includes(field))
                    .map((field) => (
                      <label className="flex items-center gap-2" key={field}>
                        <Checkbox
                          checked={clearFields.includes(field)}
                          onCheckedChange={(checked) =>
                            setClearFields((current) =>
                              checked === true
                                ? [...current, field]
                                : current.filter((value) => value !== field),
                            )
                          }
                        />
                        {t(`Import.field.${field}`)}
                      </label>
                    ))}
                </div>
              </details>
            </div>
          )}
          {(step === "preview" || step === "confirm" || step === "results") && report && (
            <>
              <div className="import-counts">
                {actions.map((action) => (
                  <div key={action}>
                    <strong>{report.counts[action]}</strong>
                    <span>{t(`Import.action.${action}`)}</span>
                  </div>
                ))}
              </div>
              {report.counts.conflict + report.counts.error > 0 && (
                <p className="text-destructive my-4">
                  {t("Import.conflictNotice", {
                    count: report.counts.conflict + report.counts.error,
                  })}
                </p>
              )}
              {step === "results" && (
                <p role="status" className="my-4">
                  {t(successful ? "Import.completed" : "Import.noSuccess", { count: successful })}
                </p>
              )}
              {step === "confirm" ? (
                <div className="grid gap-4 my-5">
                  <p>{t("Import.confirmNotice", { count: successful })}</p>
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(value) => setConfirmed(value === true)}
                    />
                    {t("Import.confirmCheck")}
                  </label>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap justify-between items-center gap-3 my-4">
                    <Field label={t("Import.rowStatus")}>
                      <select
                        className="select-control"
                        value={rowFilter}
                        onChange={(event) => {
                          setRowFilter(event.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="">{t("Import.allRows")}</option>
                        {actions.map((action) => (
                          <option key={action} value={action}>
                            {t(`Import.action.${action}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadFile(
                          new Blob([serializeProductImportResultCsv(report)], {
                            type: "text/csv;charset=utf-8",
                          }),
                          "product-import-results.csv",
                        )
                      }
                    >
                      <Download />
                      {t("Import.downloadReport")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        !report.rows.some(
                          (row) => row.action === "error" || row.action === "conflict",
                        )
                      }
                      onClick={() =>
                        downloadFile(
                          new Blob(
                            [
                              serializeProductImportResultCsv({
                                rows: report.rows.filter(
                                  (row) => row.action === "error" || row.action === "conflict",
                                ),
                              }),
                            ],
                            { type: "text/csv;charset=utf-8" },
                          ),
                          "product-import-errors.csv",
                        )
                      }
                    >
                      <Download />
                      {t("Import.downloadErrors")}
                    </Button>
                  </div>
                  <div className="table-wrap import-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Import.row")}</th>
                          <th>{t("Status")}</th>
                          <th>{t("Import.changes")}</th>
                          <th>{t("Import.issues")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice((currentPage - 1) * 20, currentPage * 20).map((row) => (
                          <tr key={row.rowNumber}>
                            <td>
                              {row.rowNumber}
                              <small className="block text-muted-foreground">{row.productId}</small>
                            </td>
                            <td>
                              <span
                                className={
                                  row.action === "error" || row.action === "conflict"
                                    ? "text-destructive"
                                    : "text-foreground"
                                }
                              >
                                {t(`Import.action.${row.action}`)}
                              </span>
                            </td>
                            <td>
                              {row.changes.length
                                ? row.changes.map((change) => (
                                    <div className="import-change" key={change.field}>
                                      <strong>{t(`Import.field.${change.field}`)}</strong>
                                      <span>
                                        {change.from || "—"} → {change.to || "∅"}
                                      </span>
                                    </div>
                                  ))
                                : "—"}
                            </td>
                            <td>
                              {row.issues.map((issue) => (
                                <p key={issue.code}>{t(`Import.${issue.code}`)}</p>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && <p className="p-5">{t("Import.noRows")}</p>}
                  </div>
                  <div className="catalog-pagination">
                    <p>
                      {t("{count} results · Page {page} of {pages}", {
                        count: rows.length,
                        page: currentPage,
                        pages,
                      })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={t("Previous page")}
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        <ArrowLeft />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={t("Next page")}
                        disabled={currentPage === pages}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="import-footer">
          {step !== "upload" && step !== "results" && (
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                setStep(step === "mapping" ? "upload" : "mapping");
              }}
            >
              <ArrowLeft />
              {t("Import.backMapping")}
            </Button>
          )}
          {step === "mapping" && (
            <Button
              disabled={!ready || !table || !validateProductMapping(table, mapping)}
              onClick={preview}
            >
              {t("Import.reviewMapping")}
              <ArrowRight />
            </Button>
          )}
          {step === "preview" && (
            <Button disabled={!successful} onClick={() => setStep("confirm")}>
              {t("Import.continueConfirm")}
              <ArrowRight />
            </Button>
          )}
          {step === "confirm" && (
            <Button disabled={!confirmed || !ready} onClick={apply}>
              {t("Import.apply")}
            </Button>
          )}
          {step === "results" && <Button onClick={onClose}>{t("Import.returnCatalog")}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
