import { useEffect, useReducer, useState } from "react";
import { campaignCategories, campaignCoverStyle, campaignThemes, safeImageUrl, safeThemeColor } from "./campaign-style";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  Globe2,
  Headphones,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Archive,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDemo } from "./store";
import { usePrintJobs } from "./printing-store";
import { DemoNotice, Field, Status, TextField } from "./ui";
import { demoProduct } from "./seed";
import {
  emptyAfterSalesFilters,
  filterAfterSalesRecords,
  type AfterSalesFilters,
} from "./after-sales-filter";
import { nextAvailableBatchNumber,
  assertIssuedGtinUnchanged,
  archiveProduct,
  deleteProduct,
  productDeletionImpact,
  publishProduct,
  saveDraft,
  type Campaign,
  type Locale,
  type Product,
} from "./domain";
import { cn } from "@/lib/utils";
import { AdminLanguageProvider, useAdminTranslation, useLanguage } from "./language";
import { translateAdmin } from "./translations";
import { ProductUnits } from "./product-units";
import { CampaignBulkBar, CampaignCardActions, CampaignViewTabs, useCampaignSelection } from "./campaign-manager";
import { ProductCatalog } from "./product-catalog";
import { DppProductSummary, DppStatusPage } from "./dpp-status";
import { BuildInfoPanel } from "./build-info-panel";
import { downloadFile } from "./digital-link-qr";
import {
  DEMO_SCAN_END,
  demoDailyScans,
  scanWindow,
  scanTicks,
  scanDateLabel,
  type ScanRange,
} from "./dashboard-analytics";
import {
  buildMappingExportCsv,
  initialMappingView,
  mappingPage,
  mappingPageSizes,
  mappingRows,
  mappingViewReducer,
  type MappingFilters,
} from "./transparency-table";
const nav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Products", path: "/admin/products", icon: Box },
  { label: "Transparency", path: "/admin/transparency", icon: ShieldCheck },
  { label: "After-sales", path: "/admin/after-sales", icon: Headphones },
  { label: "Marketing & Community", path: "/admin/marketing", icon: Users },
  { label: "DPP Ready", path: "/admin/dpp", icon: Leaf },
] as const;
export function AdminLayout() {
  const [language, setLanguage] = useLanguage("admin");
  const t = (key: string) => translateAdmin(language, key);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useDemo();
  const current =
    path === "/admin/printing"
      ? "Print.title"
      : nav.find((n) => n.path === path)?.label || "Dashboard";
  return (
    <AdminLanguageProvider language={language}>
      <div lang={language} className={cn("admin-shell", collapsed && "sidebar-collapsed")}>
        {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
        <aside className={cn("admin-sidebar", mobileOpen && "mobile-open")}>
          <Link
            to="/admin"
            className="app-logo"
            aria-label="Product iCode Connect"
            title="Product iCode Connect"
          >
            <img
              className="platform-logo-horizontal"
              src="/brand/product-icode/01_Primary_Horizontal.png"
              width={1413}
              height={363}
              alt="Product iCode"
            />
            <img
              className="platform-logo-icon"
              src="/brand/product-icode/04_Icon_Only.png"
              width={638}
              height={608}
              alt="Product iCode"
            />
            <span className="platform-product-name">Product iCode Connect</span>
          </Link>
          <div className="workspace">
            <span className="brand-avatar">N</span>
            <div className="sidebar-text">
              <strong>NOVA Home</strong>
              <small>{t("Demo workspace")}</small>
            </div>
            <ChevronDown size={15} className="sidebar-text ml-auto" />
          </div>
          <p className="nav-caption sidebar-text">{t("WORKSPACE")}</p>
          <nav>
            {nav.map((n) => (
              <Link
                key={n.path}
                to={n.path}
                activeOptions={{ exact: true, includeSearch: false }}
                title={t(n.label)}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-item", path === n.path && "active")}
              >
                <n.icon size={18} />
                <span className="sidebar-text">{t(n.label)}</span>
                {n.label === "DPP Ready" && (
                  <span className="sidebar-text nav-soon">{t("DEMO")}</span>
                )}
                {n.label === "After-sales" && (
                  <span className="sidebar-text nav-count">
                    {
                      state.records.filter((r) => r.kind === "Support" && r.status !== "Resolved")
                        .length
                    }
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sandbox-box sidebar-text">
              <span>
                <Sparkles size={15} />
                {t("Your demo workspace")}
              </span>
              <p>{t("Explore a connected product journey.")}</p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to="/p/$slug" params={{ slug: "airpure-mini" }}>
                  {t("View AirPure Mini demo")}
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setHelp(true)}
              className="nav-item w-full justify-start"
            >
              <CircleHelp />
              <span className="sidebar-text">{t("Help & resources")}</span>
              <ExternalLink className="sidebar-text ml-auto" />
            </Button>
            <div className="profile">
              <span className="profile-avatar">JD</span>
              <div className="sidebar-text">
                <strong>{t("Demo Administrator")}</strong>
                <small>{t("Workspace owner")}</small>
              </div>
              <span className="sidebar-text ml-auto">
                <MoreHorizontal size={17} />
              </span>
            </div>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                title={t("Toggle navigation")}
                aria-label={t("Toggle navigation")}
                onClick={() => {
                  if (window.innerWidth < 900) setMobileOpen(!mobileOpen);
                  else setCollapsed(!collapsed);
                }}
              >
                <Menu />
              </Button>
              <span className="text-muted-foreground hidden sm:inline">{t("Workspace")}</span>
              <ChevronRight size={14} className="text-muted-foreground hidden sm:inline" />
              <span className="text-sm font-medium">{t(current)}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="language-picker admin-language-picker">
                <Globe2 size={16} />
                <select
                  aria-label={t("Language")}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Locale)}
                >
                  <option value="zh">ZH</option>
                  <option value="en">EN</option>
                  <option value="de">DE</option>
                </select>
              </label>
              <span className="environment">
                <span />
                {t("Demo environment")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("Notifications")}
                onClick={() => setNoticeOpen(!noticeOpen)}
                className="relative"
              >
                <Bell />
                <span className="notification-dot" />
              </Button>
              <span className="top-avatar">JD</span>
            </div>
            {noticeOpen && (
              <div className="notifications">
                <strong>{t("Recent activity · Demo Data")}</strong>
                {state.records.slice(0, 3).map((r) => (
                  <div key={r.id}>
                    <span>
                      {t(r.kind)} · {r.name}
                    </span>
                    <small>{r.details}</small>
                  </div>
                ))}
              </div>
            )}
          </header>
          <main className="admin-content">
            <Outlet />
          </main>
          <footer className="admin-footer">
            <BuildInfoPanel />
            <div className="admin-footer-legal">
              <span>© 2026 Product iCode Connect</span>
              <span>
                {t("Germany & European Union")} <Globe2 size={13} />
              </span>
            </div>
          </footer>
        </div>
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent closeLabel={t("Close")}>
            <DialogTitle>{t("About this workspace")}</DialogTitle>
            <DialogDescription>
              {t(
                "This is a browser-local Product iCode Connect prototype. No user authentication, cloud database, email services or Amazon API is connected. Use fictional details only. Publishing a product updates its consumer page in the same browser.",
              )}
            </DialogDescription>
            <DemoNotice />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLanguageProvider>
  );
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
export function Dashboard() {
  const { t, language } = useAdminTranslation();
  const { state } = useDemo();
  const [range, setRange] = useState<ScanRange>(30);
  const published = state.products.filter((p) => p.published).length;
  const metrics = [
    {
      title: "Total products",
      value: state.products.length,
      note: t("{count} published product", { count: published }),
      change: "Active catalog",
      icon: Box,
      tone: "mint",
    },
    {
      title: "Product scans",
      value: state.visits.toLocaleString(
        language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
      ),
      note: "Across all digital product pages",
      change: "Cumulative · Demo Data",
      icon: QrCode,
      tone: "blue",
    },
    {
      title: "After-sales requests",
      value: state.records.filter((r) => r.kind === "Support").length,
      note: t("{count} awaiting response", {
        count: state.records.filter((r) => r.kind === "Support" && r.status === "New").length,
      }),
      change: "Needs attention",
      icon: Headphones,
      tone: "peach",
    },
    {
      title: "Event registrations",
      value: state.records.filter((r) => r.kind === "Event").length,
      note: t("{count} live community event", {
        count: state.campaigns.filter((e) => e.status === "Published").length,
      }),
      change: "Community growth",
      icon: Users,
      tone: "lavender",
    },
  ];
  const analytics = scanWindow(demoDailyScans, range, DEMO_SCAN_END);
  const chart = analytics.current;
  const numberLocale = language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB";
  const yMax = Math.max(120, Math.ceil(Math.max(...chart.map((row) => row.scans)) / 40) * 40);
  const points = chart
    .map((row, i) => `${(i * 700) / (chart.length - 1)},${180 - (row.scans / yMax) * 160}`)
    .join(" ");
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "icode-demo-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow={t("YOUR CONNECTED PRODUCT WORKSPACE")}
        title={t("Dashboard")}
        subtitle={t("A clearer view of your products, customers, and community.")}
      >
        <select
          aria-label={t("Reporting period")}
          className="select-control"
          value={`Last ${range} days`}
          onChange={(e) =>
            setRange(
              e.target.value === "Last 7 days" ? 7 : e.target.value === "Last 90 days" ? 90 : 30,
            )
          }
        >
          <option value="Last 30 days">{t("Last 30 days")}</option>
          <option value="Last 7 days">{t("Last 7 days")}</option>
          <option value="Last 90 days">{t("Last 90 days")}</option>
        </select>
        <Button variant="outline" onClick={exportData}>
          <ArrowDownToLine />
          {t("Export report")}
        </Button>
      </PageHeading>
      <DemoNotice
        text={t(
          "You’re exploring a demo workspace. All products, identifiers, events, and customer records are Demo Data. Stored in this browser only — no cross-device sync or production database.",
        )}
      />
      <div className="metrics-grid">
        {metrics.map((m) => (
          <article key={m.title} className="metric-card">
            <div className="flex items-center justify-between">
              <span>{t(m.title)}</span>
              <div className={cn("metric-icon", m.tone)}>
                <m.icon size={19} />
              </div>
            </div>
            <strong>{m.value}</strong>
            <div className="metric-bottom">
              <span
                className={m.title === "After-sales requests" ? "text-warning" : "text-primary"}
              >
                {t(m.change)}
              </span>
            </div>
            <p>{t(m.note)}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="chart-panel" aria-label={t("Product engagement")}>
          <div className="section-head">
            <div>
              <h2>{t("Product engagement")}</h2>
              <p>{t("Scan activity across your digital product pages")}</p>
            </div>
            <div className="segmented">
              {([7, 30, 90] as const).map((r) => (
                <Button
                  key={r}
                  variant="ghost"
                  size="sm"
                  className={range === r ? "selected" : ""}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {t(`${r} days`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>{analytics.total.toLocaleString(numberLocale)}</strong>
            <span className="text-primary">
              {analytics.changePercent !== null && analytics.changePercent >= 0 && (
                <ArrowUpRight size={14} />
              )}
              {analytics.changePercent === null
                ? "—"
                : `${analytics.changePercent >= 0 ? "+" : ""}${analytics.changePercent.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
            </span>
            <small>{t("vs. previous period · Demo Data")}</small>
          </div>
          <div className="scan-chart">
            <div className="chart-y">
              {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                <span key={fraction}>{yMax * fraction}</span>
              ))}
            </div>
            <div className="chart-plot">
              <svg
                viewBox="0 0 700 190"
                preserveAspectRatio="none"
                role="img"
                aria-label={t("Demo scan activity chart")}
              >
                <defs>
                  <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity=".16" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 60, 100, 140, 180].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="700"
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="4 4"
                  />
                ))}
                <polygon points={`0,180 ${points} 700,180`} fill="url(#chart-fill)" />
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {chart.map((row, index) => (
                  <circle
                    key={row.date}
                    data-date={row.date}
                    data-scans={row.scans}
                    cx={(index * 700) / (chart.length - 1)}
                    cy={180 - (row.scans / yMax) * 160}
                    r="2"
                    fill="var(--primary)"
                  >
                    <title>{`${scanDateLabel(row.date, language)}: ${row.scans.toLocaleString(numberLocale)}`}</title>
                  </circle>
                ))}
              </svg>
              {[false, true].map((compact) => (
                <div
                  key={String(compact)}
                  className={`chart-x ${compact ? "chart-x-compact" : "chart-x-full"}`}
                >
                  {scanTicks(chart, compact).map((tick) => (
                    <span
                      key={tick.date}
                      data-date={tick.date}
                      className={
                        tick.index === 0
                          ? "tick-first"
                          : tick.index === chart.length - 1
                            ? "tick-last"
                            : ""
                      }
                      style={{ left: `${tick.position * 100}%` }}
                    >
                      {scanDateLabel(tick.date, language)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span />
            {t("Product scans")}
            <small>{t("Illustrative demo analytics")}</small>
          </div>
        </section>
        <section className="journey-panel">
          <div className="section-head">
            <div>
              <h2>{t("Your product journey")}</h2>
              <p>{t("From a scan to a lasting connection")}</p>
            </div>
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="journey-steps">
            {[
              {
                icon: Box,
                label: "Create a digital identity",
                detail: "Give your product a connected home",
                done: published > 0,
                path: "/admin/products",
              },
              {
                icon: BookOpen,
                label: "Make it useful",
                detail: "Add guides, FAQs, and product stories",
                done: true,
                path: "/admin/content",
              },
              {
                icon: Users,
                label: "Build your community",
                detail: "Bring your customers closer",
                done: state.campaigns.some((e) => e.status === "Published"),
                path: "/admin/marketing",
              },
            ].map((s, i) => (
              <div className="journey-step" key={s.label}>
                <span className={cn("step-icon", s.done && "done")}>
                  <s.icon size={17} />
                </span>
                <div>
                  <strong>{t(s.label)}</strong>
                  <p>{t(s.detail)}</p>
                  <span>{s.done ? t("Completed") : t("Step {count}", { count: i + 1 })}</span>
                </div>
                {s.done && <Check size={15} className="text-primary ml-auto" />}
              </div>
            ))}
          </div>
          <Button variant="outline" asChild className="w-full mt-5">
            <Link to="/p/$slug" params={{ slug: "airpure-mini" }}>
              {t("View AirPure Mini demo")}
              <ArrowUpRight />
            </Link>
          </Button>
          <span className="journey-foot">
            <Globe2 size={13} />
            {t("Designed for the European market")}
          </span>
        </section>
      </div>
      <section className="product-section">
        <div className="section-head">
          <div>
            <h2>
              {t("Your products")}
              <span className="count-pill">{state.products.length}</span>
            </h2>
            <p>{t("Digital identities that connect your brand to your customers")}</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/products">
              <Plus />
              {t("Add product")}
            </Link>
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("PRODUCT")}</th>
                <th>{t("PRODUCT ID / SKU")}</th>
                <th>{t("MARKET")}</th>
                <th>{t("STATUS")}</th>
                <th>{t("SCANS")}</th>
                <th>{t("LAST PUBLISHED")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.products.map((p) => (
                <tr key={p.draft.id}>
                  <td>
                    <Link to="/admin/products" className="product-cell">
                      <img src={p.draft.image} alt="" width={48} height={48} />
                      <span>
                        <strong>{p.draft.name}</strong>
                        <small>
                          {p.draft.brand}
                          {t("· Smart home")}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="table-mono">{p.draft.model}</span>
                    <small>{p.draft.sku}</small>
                  </td>
                  <td>
                    <span>{t("🇩🇪 Germany")}</span>
                    <small>{t("European Union")}</small>
                  </td>
                  <td>
                    <Status value={p.published ? "Published" : "Draft"} />
                  </td>
                  <td className="font-medium">
                    {p.published
                      ? state.visits.toLocaleString(
                          language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
                        )
                      : "—"}
                  </td>
                  <td>
                    {p.published
                      ? new Date(p.published.publishedAt || "").toLocaleDateString(
                          language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                    <small>{t("Demo Data")}</small>
                  </td>
                  <td>
                    <Button variant="ghost" size="icon" asChild title={t("Edit product")}>
                      <Link to="/admin/products">
                        <MoreHorizontal />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/admin/products" className="section-link">
          {t("Manage all products")}
          <ArrowRight size={14} />
        </Link>
      </section>
      <div className="lower-grid">
        <section>
          <div className="section-head">
            <div>
              <h2>{t("Recent activity")}</h2>
              <p>{t("The latest moments in your workspace")}</p>
            </div>
            <Link to="/admin/after-sales" className="small-link">
              {t("View all")}
              <ArrowRight size={14} />
            </Link>
          </div>
          {state.records.slice(0, 3).map((r) => (
            <div className="activity-item" key={r.id}>
              <span
                className={cn(
                  "activity-icon",
                  r.kind === "Warranty" ? "mint" : r.kind === "Support" ? "blue" : "lavender",
                )}
              >
                {r.kind === "Support" ? (
                  <Headphones size={17} />
                ) : r.kind === "Warranty" ? (
                  <ShieldCheck size={17} />
                ) : (
                  <Users size={17} />
                )}
              </span>
              <div>
                <strong>
                  {r.kind === "Support"
                    ? t("New support request")
                    : r.kind === "Warranty"
                      ? t("Warranty registered")
                      : t("New event registration")}
                </strong>
                <p>
                  {r.name} · {r.kind === "Event" ? t("Berlin community event") : "AirPure Mini"}
                </p>
              </div>
              <small>{r.date.slice(5)}</small>
            </div>
          ))}
        </section>
        <section className="dpp-teaser">
          <div className="flex items-center gap-3">
            <span className="dpp-icon">
              <Leaf size={21} />
            </span>
            <span className="demo-label">{t("LOOKING AHEAD")}</span>
          </div>
          <h2>{t("A more transparent product future.")}</h2>
          <p>
            {t(
              "Start organizing your product information for the next chapter of digital product passports.",
            )}
          </p>
          <Button variant="outline" asChild>
            <Link to="/admin/dpp">
              {t("Explore DPP Ready")}
              <ArrowRight />
            </Link>
          </Button>
          <small>{t("Demo only. Not a declaration of EU DPP compliance.")}</small>
        </section>
      </div>
    </>
  );
}
export function Products({
  tab,
  onTabChange,
  catalogInitially = false,
}: {
  tab: "basic" | "content" | "units" | "links" | "publishing";
  onTabChange: (tab: "basic" | "content" | "units" | "links" | "publishing") => void;
  catalogInitially?: boolean;
}) {
  const { t, language } = useAdminTranslation();
  const { state, update, ready } = useDemo();
  const [selected, setSelected] = useState("demo-prod-airpure-001");
  const entry = state.products.find((p) => p.draft.id === selected);
  const { jobs: printJobs, save: savePrintJobs } = usePrintJobs();
  const [form, setForm] = useState<Product>(entry?.draft || demoProduct);
  const [locale, setLocale] = useState<Locale>("en");
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [catalog, setCatalog] = useState(catalogInitially);
  useEffect(() => {
    const p = state.products.find((p) => p.draft.id === selected);
    if (p) {
      setForm(p.draft);
      setDirty(false);
    }
  }, [ready, selected]);
  const change = <K extends keyof Product>(key: K, value: Product[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  function save(publish = false) {
    try {
      assertIssuedGtinUnchanged(state, form);
    } catch {
      toast.error(t("GTIN cannot change after unit identities have been issued."));
      return;
    }
    update((s) => {
      const draft = saveDraft(s, form);
      return publish ? publishProduct(draft, form) : draft;
    });
    setDirty(false);
    toast.success(
      publish
        ? t("Product published. Consumer page is now updated.")
        : t("Draft saved. Consumer page is unchanged."),
    );
  }
  function archive() {
    if (!entry?.published || !window.confirm(t("Archive.confirm"))) return;
    update((s) => archiveProduct(s, form.id));
    toast.success(t("Archive.done"));
  }
  function remove() {
    const impact = productDeletionImpact(state, form.id);
    const jobs = printJobs.filter((job) => job.productId === form.id);
    if (!window.confirm(t("Delete.confirm", { name: form.name, ...impact, jobs: jobs.length })))
      return;
    try {
      if (jobs.length) savePrintJobs(printJobs.filter((job) => job.productId !== form.id));
    } catch {
      toast.error(t("Delete.storageError"));
      return;
    }
    update((s) => deleteProduct(s, form.id));
    setDirty(false);
    setCatalog(true);
    toast.success(t("Delete.done"));
  }
  function create() {
    const id = `demo-prod-${crypto.randomUUID()}`;
    const p: Product = {
      ...structuredClone(demoProduct),
      id,
      slug: `product-${id.slice(-8)}`,
      name: "Untitled product",
      sku: "",
      gtin: "",
      gtinStatus: "Demo",
      asin: "",
    };
    update((s) => {
      const next = saveDraft(s, p);
      return {
        ...next,
        batches: [
          ...next.batches,
          {
            id: `demo-batch-${crypto.randomUUID()}`,
            productId: id,
            batchNumber: nextAvailableBatchNumber(next.batches, "DEMO-NEW"),
            status: "Draft",
          },
        ],
      };
    });
    setSelected(id);
    setForm(p);
    setDirty(false);
    setCatalog(false);
  }
  async function imageFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1500000) {
      toast.error(t("Choose an image smaller than 1.5 MB for this local demo."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") change("image", reader.result);
    };
    reader.readAsDataURL(file);
  }
  return (
    <>
      <PageHeading
        title={t("Products")}
        subtitle={t("One product identity. Every customer touchpoint.")}
      >
        {!catalog && (
          <Button
            variant="outline"
            onClick={() => {
              if (dirty && !window.confirm(t("Catalog.discard"))) return;
              setCatalog(true);
            }}
          >
            <ChevronLeft />
            {t("Catalog.title")}
          </Button>
        )}
        <Button onClick={create}>
          <Plus />
          {t("Create product")}
        </Button>
      </PageHeading>
      <DemoNotice />
      {catalog && (
        <ProductCatalog
          onOpen={(id) => {
            const product = state.products.find((entry) => entry.draft.id === id);
            if (!product) return;
            setSelected(id);
            setForm(product.draft);
            setDirty(false);
            setCatalog(false);
          }}
        />
      )}
      <div className={cn("editor-layout", catalog && "editor-layout-catalog")}>
        <aside className="product-picker">
          <div className="search-box">
            <Search size={16} />
            <Input
              aria-label={t("Search products")}
              placeholder={t("Search products…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {state.products
            .filter((p) => p.draft.name.toLowerCase().includes(query.toLowerCase()))
            .map((p) => (
              <Button
                variant="ghost"
                key={p.draft.id}
                className={cn("picker-item", selected === p.draft.id && "selected")}
                onClick={() => {
                  setSelected(p.draft.id);
                  setForm(p.draft);
                }}
              >
                <img src={p.draft.image} width={44} height={44} alt="" />
                <span>
                  <strong>{p.draft.name}</strong>
                  <small>
                    {p.published ? t("Published") : t("Draft")} · {t("Demo Data")}
                  </small>
                </span>
                <ChevronRight size={16} />
              </Button>
            ))}
        </aside>
        <section className="editor">
          <div className="section-head">
            <div>
              <h2>{form.name}</h2>
              <p className="break-all">
                {form.id} · {dirty ? t("Unsaved changes") : t("Saved draft")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Status
                value={entry?.archivedAt ? "Archived" : entry?.published ? "Published" : "Draft"}
              />
              {entry?.published && (
                <Button variant="outline" size="sm" onClick={archive}>
                  <Archive />
                  {t("Archive.action")}
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={remove} disabled={!entry}>
                <Trash2 />
                {t("Delete.action")}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/printing" search={{ productId: form.id }}>
                  <ClipboardList />
                  {t("Print.title")}
                </Link>
              </Button>
              {entry?.published ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/p/$slug"
                    params={{ slug: entry.published.slug }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                    {t("Preview consumer page")}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title={t("Publish this product first.")}
                >
                  <ExternalLink />
                  {t("Publish this product first.")}
                </Button>
              )}
            </div>
          </div>
          {!catalog && <DppProductSummary productId={form.id} />}
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (
                value === "basic" ||
                value === "content" ||
                value === "units" ||
                value === "links" ||
                value === "publishing"
              )
                onTabChange(value);
            }}
          >
            <TabsList className="product-tabs" aria-label={t("Products")}>
              <TabsTrigger value="basic">
                <Box size={16} />
                {t("Model information")}
              </TabsTrigger>
              <TabsTrigger value="content">
                <BookOpen size={16} />
                {t("Digital Content")}
              </TabsTrigger>
              <TabsTrigger value="units">
                <ClipboardList size={16} />
                {t("Batches & units")}
              </TabsTrigger>
              <TabsTrigger value="links">
                <QrCode size={16} />
                {t("Digital Links & QR")}
              </TabsTrigger>
              <TabsTrigger value="publishing">
                <Check size={16} />
                {t("Publishing")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="units">
              <ProductUnits key={form.id} productId={form.id} mode="units" />
            </TabsContent>
            <TabsContent value="links">
              <ProductUnits key={form.id} productId={form.id} mode="links" />
            </TabsContent>
            <TabsContent value="basic" className="form-grid">
              <div className="product-image-editor">
                <img src={form.image} alt={form.name} width={220} height={220} />
                <label className="file-control">
                  <Plus size={15} />
                  {t("Change image")}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => imageFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="grid gap-4">
                <TextField
                  label={t("Product name")}
                  value={form.name}
                  onChange={(v) => change("name", v)}
                  required
                />
                <TextField
                  label={t("Brand")}
                  value={form.brand}
                  onChange={(v) => change("brand", v)}
                />
                <TextField
                  label={t("Model")}
                  value={form.model}
                  onChange={(v) => change("model", v)}
                />
              </div>
              <TextField label="SKU" value={form.sku} onChange={(v) => change("sku", v)} />
              <TextField
                label={t("GTIN · Demo Data")}
                value={form.gtin}
                onChange={(v) => change("gtin", v)}
                disabled={state.units.some((unit) => unit.productId === form.id)}
                title={
                  state.units.some((unit) => unit.productId === form.id)
                    ? t("GTIN is locked after unit identities are issued.")
                    : undefined
                }
              />
              <TextField
                label={t("ASIN · Demo Data")}
                value={form.asin}
                onChange={(v) => change("asin", v)}
              />
              <Field label={t("GTIN status")}>
                <select
                  className="select-control"
                  value={form.gtinStatus}
                  onChange={(e) => change("gtinStatus", e.target.value as Product["gtinStatus"])}
                >
                  <option value="Demo">{t("Demo · not a formal GS1 claim")}</option>
                  <option value="Format valid · unverified">
                    {t("Format valid · unverified")}
                  </option>
                  <option value="Verified by GS1">{t("Verified by GS1")}</option>
                </select>
              </Field>
            </TabsContent>
            <TabsContent value="content" className="form-grid">
              <div className="col-span-full flex flex-wrap gap-3 items-center justify-between mt-3">
                <h3>{t("Localized content")}</h3>
                <select
                  className="select-control"
                  aria-label={t("Content language")}
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                >
                  <option value="en">{t("English")}</option>
                  <option value="de">{t("Deutsch")}</option>
                  <option value="zh">中文</option>
                </select>
              </div>
              {(["description", "manual", "faq"] as const).map((k) => (
                <div key={k} className="col-span-full">
                  <Field
                    label={
                      k === "description"
                        ? t("Product description")
                        : k === "manual"
                          ? t("User manual · Instructions or HTTPS link")
                          : t("Frequently asked questions")
                    }
                  >
                    <textarea
                      aria-label={
                        k === "description"
                          ? t("Product description")
                          : k === "manual"
                            ? t("User manual")
                            : t("Frequently asked questions")
                      }
                      className="textarea-control"
                      rows={k === "description" ? 3 : 4}
                      value={form[k][locale]}
                      onChange={(e) => change(k, { ...form[k], [locale]: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
              <div className="col-span-full">
                <TextField
                  label={t("Video link · HTTPS URL (optional)")}
                  type="url"
                  value={form.video}
                  onChange={(v) => change("video", v)}
                />
              </div>
            </TabsContent>
            <TabsContent value="publishing">
              <dl className="publishing-details">
                <div>
                  <dt>{t("Draft")}</dt>
                  <dd>
                    <Status value={dirty ? "Unsaved changes" : "Saved draft"} />
                  </dd>
                </div>
                <div>
                  <dt>{t("Published version")}</dt>
                  <dd>
                    <Status value={entry?.published ? "Published" : "Not published"} />
                  </dd>
                </div>
                <div>
                  <dt>{t("Last published")}</dt>
                  <dd>
                    {entry?.published?.publishedAt
                      ? new Date(entry.published.publishedAt).toLocaleString(
                          language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
                        )
                      : t("Not published")}
                  </dd>
                </div>
              </dl>
              <Button variant="outline" asChild disabled={!entry?.published}>
                {entry?.published ? (
                  <Link
                    to="/p/$slug"
                    params={{ slug: entry.published.slug }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                    {t("Preview consumer page")}
                  </Link>
                ) : (
                  <span>
                    <ExternalLink />
                    {t("Preview consumer page")}
                  </span>
                )}
              </Button>
              <div className="editor-footer">
                <p>{t("Only published versions appear on consumer pages.")}</p>
                <Button disabled={!form.name.trim()} onClick={() => save(true)}>
                  <Check />
                  {t("Publish update")}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <div className="editor-footer">
            <p>{t("Only published versions appear on consumer pages.")}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save()}>
                {t("Save draft")}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
export function AfterSales() {
  const { t, language } = useAdminTranslation();
  const { state, update } = useDemo();
  const [f, setF] = useState<AfterSalesFilters>(emptyAfterSalesFilters);
  const set = (patch: Partial<AfterSalesFilters>) => setF((v) => ({ ...v, ...patch }));
  const records = filterAfterSalesRecords(state, f);
  const batchOptions = state.batches.filter((b) => !f.productId || b.productId === f.productId);
  const active = JSON.stringify(f) !== JSON.stringify(emptyAfterSalesFilters);
  return (
    <>
      <PageHeading
        title={t("After-sales")}
        subtitle={t("Thoughtful support, beyond the first purchase.")}
      />
      <DemoNotice />
      <div className="section-head mt-7">
        <div className="segmented">
          {["", "Warranty", "Support"].map((k) => (
            <Button
              key={k || "all"}
              size="sm"
              variant="ghost"
              className={f.kind === k ? "selected" : ""}
              onClick={() => set({ kind: k })}
            >
              {t(k || "All records")}
            </Button>
          ))}
        </div>
        <div className="search-box">
          <Search size={16} />
          <Input
            aria-label={t("Search customer records")}
            placeholder={t("Search demo records…")}
            value={f.query}
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
      </div>
      <div className="form-grid mt-4 items-end">
        <Field label={t("Product")}>
          <select
            className="select-control"
            value={f.productId}
            onChange={(e) => set({ productId: e.target.value, batchId: "" })}
          >
            <option value="">{t("All products")}</option>
            {state.products.map((p) => (
              <option key={p.draft.id} value={p.draft.id}>
                {p.draft.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Production batch")}>
          <select
            className="select-control"
            value={f.batchId}
            onChange={(e) => set({ batchId: e.target.value })}
          >
            <option value="">{t("All batches")}</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Status")}>
          <select
            className="select-control"
            value={f.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="">{t("All statuses")}</option>
            <option value="New">{t("New")}</option>
            <option value="In progress">{t("In progress")}</option>
            <option value="Resolved">{t("Resolved")}</option>
          </select>
        </Field>
        <TextField label={t("From date")} type="date" value={f.from} onChange={(v) => set({ from: v })} />
        <TextField label={t("To date")} type="date" value={f.to} onChange={(v) => set({ to: v })} />
        <Button variant="outline" disabled={!active} onClick={() => setF(emptyAfterSalesFilters)}>
          {t("Clear filters")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        {t("{count} records", { count: records.length })}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("RECORD")}</th>
              <th>{t("CUSTOMER · DEMO DATA")}</th>
              <th>{t("TYPE")}</th>
              <th>{t("DETAILS")}</th>
              <th>{t("DATE")}</th>
              <th>{t("STATUS")}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="table-mono">{r.id}</td>
                <td>
                  <strong>{r.name}</strong>
                  <small>{r.email}</small>
                </td>
                <td>{t(r.kind)}</td>
                <td className="details-cell">
                  {r.details}
                  <small>
                    {r.serial} · {r.unitId || t("Model-level record")}
                  </small>
                </td>
                <td>{r.date}</td>
                <td>
                  {r.kind === "Support" ? (
                    <select
                      className="select-control"
                      aria-label={t("Status {id}", { id: r.id })}
                      value={r.status}
                      onChange={(e) => {
                        const status = e.target.value as typeof r.status;
                        update((s) => ({
                          ...s,
                          records: s.records.map((v) => (v.id === r.id ? { ...v, status } : v)),
                        }));
                        toast.success(t("Ticket status updated"));
                      }}
                    >
                      <option value="New">{t("New")}</option>
                      <option value="In progress">{t("In progress")}</option>
                      <option value="Resolved">{t("Resolved")}</option>
                    </select>
                  ) : (
                    <Status value="New" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && <p className="empty-state">{t("No records match your search.")}</p>}
      </div>
      <p className="text-sm text-muted-foreground mt-5">
        {t(
          "Warranty registration never creates marketing consent. Marketing permissions are managed separately.",
        )}
      </p>
    </>
  );
}
export function Marketing() {
  const { t, language } = useAdminTranslation();
  const { state, update } = useDemo();
  const [edit, setEdit] = useState<Campaign | null>(null);
  const [lang, setLang] = useState<Locale>("en");
  const [tab, setTab] = useState("Events");
  const sel = useCampaignSelection(state.campaigns);
  const create = () =>
    setEdit({
      id: `demo-event-${crypto.randomUUID()}`,
      title: { en: "New community event", de: "Neue Community-Veranstaltung", zh: "新社区活动" },
      city: "Berlin, Germany",
      date: "2026-12-20",
      description: { en: "", de: "", zh: "" },
      status: "Draft",
    });
  const save = (status: Campaign["status"]) => {
    if (!edit) return;
    const event = { ...edit, status };
    update((s) => ({
      ...s,
      campaigns: s.campaigns.some((e) => e.id === event.id)
        ? s.campaigns.map((e) => (e.id === event.id ? event : e))
        : [...s.campaigns, event],
    }));
    setEdit(null);
    toast.success(t(status === "Published" ? "Event published" : "Event draft saved"));
  };
  return (
    <>
      <PageHeading
        title={t("Marketing & Community")}
        subtitle={t("Meaningful local moments. Lasting brand connections.")}
      >
        <Button onClick={create}>
          <Plus />
          {t("Create event")}
        </Button>
      </PageHeading>
      <DemoNotice />
      <div className="segmented my-6 w-fit">
        {["Events", "Registrations", "Marketing permissions"].map((t) => (
          <Button
            variant="ghost"
            size="sm"
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {translateAdmin(language, t)}
          </Button>
        ))}
      </div>
      {tab === "Events" ? (
        <>
        <CampaignViewTabs sel={sel} />
        <CampaignBulkBar sel={sel} />
        {!sel.visible.length && <p className="empty-state">{t("No events in this view.")}</p>}
        <div className="event-grid">
          {sel.visible.map((e) => (
            <article className={cn("event-card", sel.selected.has(e.id) && "event-card-selected")} key={e.id}>
              <div className="event-cover" style={campaignCoverStyle(e)}>
                {e.category && <em className="event-badge">{t(e.category)}</em>}
                <Users size={36} />
                <span>{e.format === "Online" ? t("Online") : e.city.split(",")[0]}</span>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {e.date} · {t("Demo Data")}
                  </span>
                  <Status value={e.status} />
                </div>
                <h2 className="mt-4">{e.title[language]}</h2>
                <p className="my-3 text-sm text-muted-foreground">{e.description[language]}</p>
                <span className="text-xs text-muted-foreground">
                  {state.records.filter((r) => r.eventId === e.id).length} {t("registrations")}
                </span>
                <CampaignCardActions sel={sel} event={e} onEdit={() => setEdit(e)} />
              </div>
            </article>
          ))}
        </div>
        </>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("EMAIL · DEMO DATA")}</th>
                <th>{tab === "Registrations" ? t("ATTENDEE") : t("CONSENT")}</th>
                <th>{tab === "Registrations" ? t("EVENT") : t("UPDATED")}</th>
              </tr>
            </thead>
            <tbody>
              {tab === "Registrations"
                ? state.records
                    .filter((r) => r.kind === "Event")
                    .map((r) => (
                      <tr key={r.id}>
                        <td>{r.email}</td>
                        <td>{r.name}</td>
                        <td>
                          {state.campaigns.find((event) => event.id === r.eventId)?.title[
                            language
                          ] || r.details}
                        </td>
                      </tr>
                    ))
                : state.consents.map((c) => (
                    <tr key={c.email}>
                      <td>{c.email}</td>
                      <td>
                        <Status value={c.active ? "Active" : "Withdrawn"} />
                      </td>
                      <td>
                        {new Date(c.updatedAt).toLocaleDateString(
                          language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
      >
        <DialogContent closeLabel={t("Close")} className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{edit?.title[language]}</DialogTitle>
          <DialogDescription>{t("Fictional local community event · Demo Data")}</DialogDescription>
          {edit && (
            <>
              <select
                className="select-control"
                aria-label={t("Event language")}
                value={lang}
                onChange={(e) => setLang(e.target.value as Locale)}
              >
                <option value="en">{t("English")}</option>
                <option value="de">{t("Deutsch")}</option>
                <option value="zh">中文</option>
              </select>
              <TextField
                label={t("Event title")}
                value={edit.title[lang]}
                onChange={(v) => setEdit({ ...edit, title: { ...edit.title, [lang]: v } })}
              />
              <TextField
                label={t("City")}
                value={edit.city}
                onChange={(v) => setEdit({ ...edit, city: v })}
              />
              <TextField
                label={t("Date")}
                type="date"
                value={edit.date}
                onChange={(v) => setEdit({ ...edit, date: v })}
              />
              <Field label={t("Description")}>
                <textarea
                  className="textarea-control"
                  value={edit.description[lang]}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      description: { ...edit.description, [lang]: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label={t("Category")}>
                <select
                  className="select-control"
                  value={edit.category ?? ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      category: (e.target.value || undefined) as Campaign["category"],
                    })
                  }
                >
                  <option value="">{t("None")}</option>
                  {campaignCategories.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Format")}>
                <select
                  className="select-control"
                  value={edit.format ?? "In person"}
                  onChange={(e) =>
                    setEdit({ ...edit, format: e.target.value as Campaign["format"] })
                  }
                >
                  <option value="In person">{t("In person")}</option>
                  <option value="Online">{t("Online")}</option>
                </select>
              </Field>
              <h3 className="font-semibold mt-2">{t("Visual styling")}</h3>
              <Field label={t("Theme color")}>
                <div className="flex flex-wrap items-center gap-2">
                  {campaignThemes.map((theme) => (
                    <button
                      type="button"
                      key={theme.id}
                      aria-label={t(`Theme ${theme.id}`)}
                      title={t(`Theme ${theme.id}`)}
                      className={`theme-swatch ${edit.themeColor === theme.color ? "selected" : ""}`}
                      style={{ background: theme.color }}
                      onClick={() => setEdit({ ...edit, themeColor: theme.color })}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label={t("Custom color")}
                    value={safeThemeColor(edit.themeColor) ?? "#1f4e79"}
                    onChange={(e) => setEdit({ ...edit, themeColor: e.target.value })}
                  />
                  {edit.themeColor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEdit({ ...edit, themeColor: undefined })}
                    >
                      {t("Reset")}
                    </Button>
                  )}
                </div>
              </Field>
              <TextField
                label={t("Cover image URL (https)")}
                placeholder="https://images.unsplash.com/..."
                value={edit.coverImage ?? ""}
                onChange={(v) => setEdit({ ...edit, coverImage: v.trim() || undefined })}
              />
              {edit.coverImage && !safeImageUrl(edit.coverImage) && (
                <p className="info-warning">{t("Only https image links are supported.")}</p>
              )}
              <span className="text-sm font-medium">{t("Live preview")}</span>
              <article className="event-card">
                <div className="event-cover" style={campaignCoverStyle(edit)}>
                  {edit.category && <em className="event-badge">{t(edit.category)}</em>}
                  <Users size={36} />
                  <span>
                    {edit.format === "Online" ? t("Online") : edit.city.split(",")[0]}
                  </span>
                </div>
                <div className="p-4">
                  <span className="text-xs text-muted-foreground">{edit.date}</span>
                  <h2 className="mt-2">{edit.title[lang]}</h2>
                  <p className="text-sm text-muted-foreground">{edit.description[lang]}</p>
                </div>
              </article>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => save("Draft")}>
                  {t("Save draft")}
                </Button>
                <Button
                  disabled={!edit.title[lang].trim() || !edit.date}
                  onClick={() => save("Published")}
                >
                  {t("Publish event")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Transparency() {
  const { t } = useAdminTranslation();
  const { state } = useDemo();
  const [view, dispatch] = useReducer(mappingViewReducer, undefined, initialMappingView);
  const rows = mappingRows(state, view.filters);
  const pagination = mappingPage(rows, view.page, view.pageSize);
  const selected = rows.filter((row) => view.selected.has(row.unit.id));
  const pageIds = pagination.rows.map((row) => row.unit.id);
  const checkedCount = pageIds.filter((id) => view.selected.has(id)).length;
  const batches = state.batches.filter(
    (batch) => !view.filters.productId || batch.productId === view.filters.productId,
  );
  function filter(change: Partial<MappingFilters>) {
    dispatch({ type: "filter", filters: { ...view.filters, ...change } });
  }
  useEffect(() => {
    if (view.page !== pagination.page) dispatch({ type: "page", page: pagination.page });
  }, [view.page, pagination.page]);
  function exportMappings(selectedOnly: boolean) {
    try {
      downloadFile(
        new Blob(["\uFEFF" + buildMappingExportCsv(state, selectedOnly ? selected : rows)], {
          type: "text/csv;charset=utf-8",
        }),
        selectedOnly ? "demo-selected-mappings.csv" : "demo-filtered-mappings.csv",
      );
    } catch {
      toast.error(
        t("Unable to export mappings. Check product, batch and Digital Link configuration."),
      );
    }
  }
  return (
    <>
      <PageHeading
        title={t("Product transparency")}
        subtitle={t("A clear identity. An honest verification journey.")}
      />
      <DemoNotice />
      <div className="info-columns mt-7">
        <section className="info-block">
          <ShieldCheck className="text-primary mb-4" size={28} />
          <h2>Amazon Transparency</h2>
          <p>
            {t(
              "Official Transparency codes are issued through Amazon’s program. Consumers should scan an official code using the Amazon Shopping or Transparency app.",
            )}
          </p>
          <span className="info-warning">
            {t("No Amazon API connected. No official verification result is provided.")}
          </span>
          <a
            href="https://www.amazon.com/transparency"
            target="_blank"
            rel="noreferrer"
            className="section-link"
          >
            {t("Amazon official information")}
            <ExternalLink size={14} />
          </a>
        </section>
        <section className="info-block">
          <QrCode className="text-info mb-4" size={28} />
          <h2>{t("Brand-owned serial codes")}</h2>
          <p>
            {t(
              "NOVA Home’s demo serial numbers connect products to this digital experience. They are not Amazon Transparency codes and cannot prove authenticity.",
            )}
          </p>
          <span className="info-warning">
            {t("Demo mappings only. A serial match is not official certification.")}
          </span>
        </section>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to="/admin/products" search={{ tab: "units" }}>
            <Box />
            {t("Batches & units")}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/products" search={{ tab: "links" }}>
            <QrCode />
            {t("Digital Links & QR")}
          </Link>
        </Button>
      </div>
      <h2 className="mt-8 mb-5">
        {t("Product identity mappings")}
        <span className="demo-label">{t("DEMO DATA")}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <Field label={t("Product / model")}>
          <select
            className="select-control w-full min-w-0"
            value={view.filters.productId}
            onChange={(event) => filter({ productId: event.target.value, batchId: "" })}
          >
            <option value="">{t("All products")}</option>
            {state.products.map(({ draft }) => (
              <option key={draft.id} value={draft.id}>
                {draft.name} · {draft.model}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Production batch")}>
          <select
            className="select-control w-full min-w-0"
            value={view.filters.batchId}
            onChange={(event) => filter({ batchId: event.target.value })}
          >
            <option value="">{t("All batches")}</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchNumber}
              </option>
            ))}
          </select>
        </Field>
        <TextField
          label={t("Search mappings")}
          value={view.filters.keyword}
          onChange={(keyword) => filter({ keyword })}
          placeholder={t("Product ID, model, SKU, GTIN, unit ID or serial")}
        />
        <Field label={t("Official code state")}>
          <select
            className="select-control w-full min-w-0"
            value={view.filters.official}
            onChange={(event) => filter({ official: event.target.value })}
          >
            <option value="">{t("All official code states")}</option>
            {["Not enrolled", "Amazon-issued code", "Amazon-accepted existing serial"].map(
              (value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm" aria-live="polite">
          {t("{count} selected", { count: selected.length })}
        </span>
        <Button
          variant="ghost"
          onClick={() =>
            dispatch({ type: "select", ids: rows.map((row) => row.unit.id), checked: true })
          }
          disabled={!rows.length}
        >
          {t("Select all filtered results")}
        </Button>
        <Button
          variant="ghost"
          disabled={!selected.length}
          onClick={() => dispatch({ type: "clear" })}
        >
          {t("Clear selection")}
        </Button>
        <Button
          variant="outline"
          disabled={!selected.length}
          title={!selected.length ? t("Select mappings to export.") : undefined}
          onClick={() => exportMappings(true)}
        >
          <ArrowDownToLine />
          {t("Export selected")}
        </Button>
        <Button variant="outline" disabled={!rows.length} onClick={() => exportMappings(false)}>
          <ArrowDownToLine />
          {t("Export filtered results")}
        </Button>
      </div>
      {!selected.length && (
        <p className="text-sm text-muted-foreground mb-3">{t("Select mappings to export.")}</p>
      )}
      <div className="table-wrap mapping-table">
        <table>
          <thead>
            <tr>
              <th>
                <Checkbox
                  aria-label={t("Select current page")}
                  disabled={!pageIds.length}
                  checked={
                    checkedCount === pageIds.length && pageIds.length > 0
                      ? true
                      : checkedCount > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) =>
                    dispatch({ type: "select", ids: pageIds, checked: checked === true })
                  }
                />
              </th>
              <th>{t("PRODUCT")}</th>
              <th>{t("UNIQUE ID")}</th>
              <th>{t("Production batch")}</th>
              <th>ASIN / GTIN</th>
              <th>{t("SKU / BRAND SERIAL")}</th>
              <th>{t("OFFICIAL CODE")}</th>
            </tr>
          </thead>
          <tbody>
            {pagination.rows.map(({ unit, product, identity, association, batch, official }) => (
              <tr key={unit.id}>
                <td>
                  <Checkbox
                    aria-label={t("Select unit {id}", { id: unit.id })}
                    checked={view.selected.has(unit.id)}
                    onCheckedChange={(checked) =>
                      dispatch({ type: "select", ids: [unit.id], checked: checked === true })
                    }
                  />
                </td>
                <td>
                  {product?.name || "—"}
                  <small>{product?.model || "—"}</small>
                </td>
                <td className="table-mono">
                  {identity ? (
                    <a className="section-link" href={identity.canonicalPath}>
                      {unit.id}
                    </a>
                  ) : (
                    unit.id
                  )}
                </td>
                <td>{batch?.batchNumber || "—"}</td>
                <td>
                  {product?.asin || "—"}
                  <small>{identity?.gtin || product?.gtin || "—"}</small>
                </td>
                <td>
                  {product?.sku || "—"}
                  <small>{unit.serial}</small>
                </td>
                <td>
                  {t(official)}
                  <small>{t(association?.evidence || "Simulated")}</small>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7}>{t("No matching units.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm" aria-live="polite">
          {t("{count} results · Page {page} of {pages}", {
            count: rows.length,
            page: pagination.page,
            pages: pagination.totalPages,
          })}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Field label={t("Rows per page")}>
            <select
              className="select-control"
              value={view.pageSize}
              onChange={(event) => dispatch({ type: "size", size: Number(event.target.value) })}
            >
              {mappingPageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="outline"
            aria-label={t("Previous page")}
            title={t("Previous page")}
            disabled={pagination.page === 1}
            onClick={() => dispatch({ type: "page", page: pagination.page - 1 })}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            aria-label={t("Next page")}
            title={t("Next page")}
            disabled={pagination.page === pagination.totalPages}
            onClick={() => dispatch({ type: "page", page: pagination.page + 1 })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
}
export function Dpp() {
  return <DppStatusPage />;
}
