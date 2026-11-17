import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "./store";
import { useAdminTranslation } from "./language";
import { Field, Status } from "./ui";
import { downloadFile } from "./digital-link-qr";
import {
  catalogExportCsv,
  catalogStatus,
  catalogPageSizes,
  catalogRows,
} from "./product-catalog-tools";
import { downloadProductTemplate, ProductImportWizard } from "./product-import-wizard";

export function ProductCatalog({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, ready } = useDemo();
  const { t } = useAdminTranslation();
  const [filters, setFilters] = useState({ query: "", brand: "", status: "" });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [importOpen, setImportOpen] = useState(false);
  const rows = catalogRows(state.products, filters);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const brands = [...new Set(state.products.map((entry) => entry.draft.brand))].sort();
  function filter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }
  return (
    <section className="product-catalog">
      <div className="section-head">
        <div>
          <h2>{t("Catalog.title")}</h2>
          <p>{t("Catalog.count", { count: state.products.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadProductTemplate}>
            <Download />
            {t("Catalog.template")}
          </Button>
          <Button
            variant="outline"
            disabled={!ready || !rows.length}
            onClick={() =>
              downloadFile(
                new Blob([catalogExportCsv(rows)], { type: "text/csv;charset=utf-8" }),
                "product-catalog.csv",
              )
            }
          >
            <Download />
            {t("Catalog.export")}
          </Button>
          <Button disabled={!ready} onClick={() => setImportOpen(true)}>
            <FileSpreadsheet />
            {t("Catalog.import")}
          </Button>
        </div>
      </div>
      <div className="catalog-filters">
        <Field label={t("Search products")}>
          <div className="search-box">
            <Search size={16} />
            <Input
              value={filters.query}
              placeholder={t("Catalog.searchHint")}
              onChange={(event) => filter("query", event.target.value)}
            />
          </div>
        </Field>
        <Field label={t("Brand")}>
          <select
            className="select-control"
            aria-label={t("Brand")}
            value={filters.brand}
            onChange={(event) => filter("brand", event.target.value)}
          >
            <option value="">{t("Catalog.allBrands")}</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Status")}>
          <select
            className="select-control"
            aria-label={t("Status")}
            value={filters.status}
            onChange={(event) => filter("status", event.target.value)}
          >
            <option value="">{t("Catalog.allStatuses")}</option>
            <option value="Draft">{t("Draft")}</option>
            <option value="Published">{t("Published")}</option>
            <option value="Archived">{t("Archived")}</option>
          </select>
        </Field>
      </div>
      <div className="table-wrap catalog-table">
        <table>
          <thead>
            <tr>
              <th>{t("Product name")}</th>
              <th>SKU</th>
              <th>GTIN</th>
              <th>{t("Brand")}</th>
              <th>{t("Status")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice((current - 1) * size, current * size)
              .map(({ draft, published, archivedAt }) => (
                <tr key={draft.id}>
                  <td>
                    <strong>{draft.name}</strong>
                    <small className="block text-muted-foreground">{draft.model}</small>
                  </td>
                  <td>{draft.sku || "—"}</td>
                  <td>{draft.gtin || "—"}</td>
                  <td>{draft.brand}</td>
                  <td>
                    <Status value={catalogStatus({ published, archivedAt })} />
                  </td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => onOpen(draft.id)}>
                      <ExternalLink />
                      {t("Catalog.open")}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-muted-foreground">{t("Catalog.empty")}</p>}
      </div>
      <div className="catalog-pagination">
        <p>
          {t("{count} results · Page {page} of {pages}", {
            count: rows.length,
            page: current,
            pages,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Field label={t("Rows per page")}>
            <select
              className="select-control"
              aria-label={t("Rows per page")}
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {catalogPageSizes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("Previous page")}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("Next page")}
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
      {importOpen && (
        <ProductImportWizard
          onClose={() => {
            setImportOpen(false);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
