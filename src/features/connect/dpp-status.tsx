import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ExternalLink, Leaf, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDemo } from "./store";
import { useAdminTranslation } from "./language";
import { DemoNotice, Field } from "./ui";
import {
  dppBusinessStatusV1Schema,
  type DppStatusAdapterV1,
  type DppStatusResultV1,
} from "./dpp-contracts";
import { configuredDppLink, createConnectDppDemoAdapter, dppResultKey } from "./dpp-view";

function useDppStatuses(adapterOverride?: DppStatusAdapterV1) {
  const { state, ready } = useDemo();
  const adapter = useMemo(
    () => adapterOverride ?? createConnectDppDemoAdapter(state.products),
    [adapterOverride, state.products],
  );
  // Product data lives in the hydrated browser repository, not an SSR route loader.
  const query = useQuery({
    queryKey: ["connect-dpp-v1", state.products, adapter],
    queryFn: () => adapter.getStatuses(state.products.map(({ draft }) => draft.id)),
    enabled: ready,
    staleTime: Math.min(adapter.cacheMaxAgeSeconds, 60) * 1000,
    refetchInterval: 60000,
    retry: false,
  });
  return { ...query, products: state.products, ready };
}

function StatusBadge({ result }: { result?: DppStatusResultV1 | undefined }) {
  const { t } = useAdminTranslation();
  const key = result ? dppResultKey(result) : "loading";
  return (
    <span
      className={cn(
        "status",
        key === "READY"
          ? "status-success"
          : ["IN_PROGRESS", "NEEDS_UPDATE"].includes(key)
            ? "status-warning"
            : key === "IN_REVIEW"
              ? "status-info"
              : "status-muted",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(`Dpp.${key}`)}
    </span>
  );
}

function StatusDate({ result }: { result?: DppStatusResultV1 | undefined }) {
  const { language, t } = useAdminTranslation();
  if (!result?.ok) return <>—</>;
  if (!result.data.updatedAt) return <>{t("Dpp.noProfile")}</>;
  return (
    <time dateTime={result.data.updatedAt}>
      {new Date(result.data.updatedAt).toLocaleString(
        language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
      )}
    </time>
  );
}

function DppAction({
  productId,
  result,
}: {
  productId: string;
  result?: DppStatusResultV1 | undefined;
}) {
  const { t } = useAdminTranslation();
  const link = configuredDppLink(productId, {
    baseUrl: import.meta.env["VITE_DPP_BASE_URL"],
    allowedOrigins: import.meta.env["VITE_DPP_ALLOWED_ORIGINS"],
  });
  const label = t(result?.ok && result.data.status === "NOT_STARTED" ? "Dpp.setup" : "Dpp.manage");
  const denied =
    result &&
    !result.ok &&
    ["FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND"].includes(result.error.code);
  return (
    <div className="dpp-action">
      {link.href && result && !denied ? (
        <Button variant="outline" size="sm" asChild>
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {label}
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ExternalLink />
          {label}
        </Button>
      )}
      {link.reason && <small>{t(link.reason)}</small>}
    </div>
  );
}

export function DppProductSummary({ productId }: { productId: string }) {
  const { t } = useAdminTranslation();
  const query = useDppStatuses();
  const index = query.products.findIndex(({ draft }) => draft.id === productId);
  const result = query.data?.[index];
  return (
    <section className="dpp-product-summary" aria-label={t("Dpp.productStatus")}>
      <div className="flex flex-wrap items-center gap-3">
        <Leaf size={18} className="text-primary" />
        <strong>{t("Dpp.productStatus")}</strong>
        {query.isError ? <span>{t("Dpp.UNAVAILABLE")}</span> : <StatusBadge result={result} />}
        <span className="demo-label">{t("DEMO DATA")}</span>
      </div>
      <p>{t("Dpp.summaryNotice")}</p>
      <DppAction productId={productId} result={result} />
    </section>
  );
}

export function DppStatusPage({ adapter }: { adapter?: DppStatusAdapterV1 }) {
  const { t } = useAdminTranslation();
  const query = useDppStatuses(adapter);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const rows = query.products
    .map(({ draft }, index) => ({ product: draft, result: query.data?.[index] }))
    .filter(({ product, result }) => {
      const needle = search.trim().toLowerCase();
      return (
        [product.name, product.sku, product.gtin, product.id, product.brand].some((value) =>
          value.toLowerCase().includes(needle),
        ) &&
        (!filter || (result && dppResultKey(result) === filter))
      );
    });
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return (
    <div className="dpp-page">
      <div className="page-heading">
        <div>
          <h1>{t("DPP Ready")}</h1>
          <p>{t("Dpp.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          disabled={!query.ready || query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw />
          {t("Dpp.refresh")}
        </Button>
      </div>
      <DemoNotice text={t("Dpp.demoNotice")} />
      <div className="dpp-boundary">
        <Leaf size={22} className="text-primary" />
        <p>{t("Dpp.readyNotice")}</p>
      </div>
      <div className="dpp-filters">
        <Field label={t("Search products")}>
          <div className="search-box">
            <Search size={16} />
            <Input
              aria-label={t("Search products")}
              value={search}
              placeholder={t("Dpp.searchHint")}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </Field>
        <Field label={t("Dpp.status")}>
          <select
            className="select-control"
            aria-label={t("Dpp.status")}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("Dpp.allStatuses")}</option>
            {[
              ...dppBusinessStatusV1Schema.options,
              "UNAVAILABLE",
              "UNAUTHENTICATED",
              "FORBIDDEN",
              "NOT_FOUND",
            ].map((key) => (
              <option key={key} value={key}>
                {t(`Dpp.${key}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {query.isError && (
        <div role="alert" className="dpp-boundary">
          {t("Dpp.readError")}
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw />
            {t("Dpp.retry")}
          </Button>
        </div>
      )}
      <div className="table-wrap dpp-table" aria-busy={query.isFetching}>
        <table>
          <thead>
            <tr>
              <th>{t("Product name")}</th>
              <th>SKU</th>
              <th>GTIN</th>
              <th>{t("Dpp.status")}</th>
              <th>{t("Dpp.updated")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * size, current * size).map(({ product, result }) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <small className="dpp-product-id">{product.id}</small>
                </td>
                <td>{product.sku || "—"}</td>
                <td>{product.gtin || "—"}</td>
                <td>
                  {query.isError ? t("Dpp.UNAVAILABLE") : <StatusBadge result={result} />}
                  {result && !result.ok && (
                    <small className="dpp-error-detail">
                      {result.error.httpStatus}
                      {result.error.code === "UNAVAILABLE"
                        ? ` · ${t(`Dpp.${result.error.reason}`)}`
                        : ""}
                    </small>
                  )}
                  {result && !result.ok && result.error.code === "UNAVAILABLE" && (
                    <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>
                      <RefreshCw />
                      {t("Dpp.retry")}
                    </Button>
                  )}
                </td>
                <td>
                  <StatusDate result={result} />
                </td>
                <td>
                  <DppAction productId={product.id} result={result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-muted-foreground">{t("Dpp.empty")}</p>}
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
              aria-label={t("Rows per page")}
              className="select-control"
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Button
            size="icon"
            variant="outline"
            aria-label={t("Previous page")}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={t("Next page")}
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
