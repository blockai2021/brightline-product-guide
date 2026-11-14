import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDemo } from "./store";
import { DemoNotice, Field, Status, TextField } from "./ui";
import { demoProduct } from "./seed";
import { publishProduct, saveDraft, type Campaign, type Locale, type Product } from "./domain";
import { cn } from "@/lib/utils";
const nav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Products", path: "/admin/products", icon: Box },
  { label: "Transparency", path: "/admin/transparency", icon: ShieldCheck },
  { label: "Content", path: "/admin/content", icon: BookOpen },
  { label: "After-sales", path: "/admin/after-sales", icon: Headphones },
  { label: "Marketing & Community", path: "/admin/marketing", icon: Users },
  { label: "DPP Ready", path: "/admin/dpp", icon: Leaf },
] as const;
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useDemo();
  const current = nav.find((n) => n.path === path)?.label || "Dashboard";
  return (
    <div className={cn("admin-shell", collapsed && "sidebar-collapsed")}>
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("admin-sidebar", mobileOpen && "mobile-open")}>
        <Link to="/admin" className="app-logo">
          <span className="logo-symbol">
            <QrCode size={21} />
          </span>
          <span className="sidebar-text">
            iCode<span className="font-normal"> Connect</span>
            <small>PRODUCT EXPERIENCE PLATFORM</small>
          </span>
        </Link>
        <div className="workspace">
          <span className="brand-avatar">N</span>
          <div className="sidebar-text">
            <strong>NOVA Home</strong>
            <small>Demo workspace</small>
          </div>
          <ChevronDown size={15} className="sidebar-text ml-auto" />
        </div>
        <p className="nav-caption sidebar-text">WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              title={n.label}
              onClick={() => setMobileOpen(false)}
              className={cn("nav-item", path === n.path && "active")}
            >
              <n.icon size={18} />
              <span className="sidebar-text">{n.label}</span>
              {n.label === "DPP Ready" && <span className="sidebar-text nav-soon">DEMO</span>}
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
              <Sparkles size={15} /> Your demo workspace
            </span>
            <p>Explore a connected product journey.</p>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/p/$slug" params={{ slug: "airpure-mini" }}>
                Open consumer experience <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => setHelp(true)}
            className="nav-item w-full justify-start"
          >
            <CircleHelp />
            <span className="sidebar-text">Help & resources</span>
            <ExternalLink className="sidebar-text ml-auto" />
          </Button>
          <div className="profile">
            <span className="profile-avatar">JD</span>
            <div className="sidebar-text">
              <strong>Demo Administrator</strong>
              <small>Workspace owner</small>
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
              title="Toggle navigation"
              aria-label="Toggle navigation"
              onClick={() => {
                if (window.innerWidth < 900) setMobileOpen(!mobileOpen);
                else setCollapsed(!collapsed);
              }}
            >
              <Menu />
            </Button>
            <span className="text-muted-foreground hidden sm:inline">Workspace</span>
            <ChevronRight size={14} className="text-muted-foreground hidden sm:inline" />
            <span className="text-sm font-medium">{current}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="environment">
              <span /> Demo environment
            </span>
            <Button variant="outline" size="sm" asChild className="consumer-link">
              <Link to="/p/$slug" params={{ slug: "airpure-mini" }}>
                <ExternalLink /> Consumer view
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Notifications"
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
              <strong>Recent activity · Demo Data</strong>
              {state.records.slice(0, 3).map((r) => (
                <div key={r.id}>
                  <span>
                    {r.kind} · {r.name}
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
          <span>© 2026 Product iCode Connect</span>
          <span>
            Germany & European Union <Globe2 size={13} />
          </span>
        </footer>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogTitle>About this workspace</DialogTitle>
          <DialogDescription>
            This is a browser-local Product iCode Connect prototype. No user authentication, cloud
            database, email services or Amazon API is connected. Use fictional details only.
            Publishing a product updates its consumer page in the same browser.
          </DialogDescription>
          <DemoNotice />
        </DialogContent>
      </Dialog>
    </div>
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
const scanPoints = [
  30, 43, 34, 51, 41, 47, 46, 64, 51, 58, 72, 63, 82, 70, 78, 65, 74, 68, 91, 80, 86, 72, 84, 77,
  98, 91, 105, 91,
];
export function Dashboard() {
  const { state } = useDemo();
  const [period, setPeriod] = useState("Last 30 days");
  const [range, setRange] = useState("30 days");
  const published = state.products.filter((p) => p.published).length;
  const metrics = [
    {
      title: "Total products",
      value: state.products.length,
      note: `${published} published product`,
      change: "Active catalog",
      icon: Box,
      tone: "mint",
    },
    {
      title: "Product scans",
      value: state.visits.toLocaleString(),
      note: "Across all digital product pages",
      change: "+18.6%",
      icon: QrCode,
      tone: "blue",
    },
    {
      title: "After-sales requests",
      value: state.records.filter((r) => r.kind === "Support").length,
      note: `${state.records.filter((r) => r.kind === "Support" && r.status === "New").length} awaiting response`,
      change: "Needs attention",
      icon: Headphones,
      tone: "peach",
    },
    {
      title: "Event registrations",
      value: state.records.filter((r) => r.kind === "Event").length,
      note: `${state.campaigns.filter((e) => e.status === "Published").length} live community event`,
      change: "Community growth",
      icon: Users,
      tone: "lavender",
    },
  ];
  const chart =
    range === "7 days"
      ? scanPoints.slice(-7)
      : range === "90 days"
        ? [...scanPoints.slice().reverse(), ...scanPoints]
        : scanPoints;
  const points = chart
    .map((n, i) => `${(i * 700) / (chart.length - 1)},${180 - n * 1.3}`)
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
        eyebrow="YOUR CONNECTED PRODUCT WORKSPACE"
        title="Dashboard"
        subtitle="A clearer view of your products, customers, and community."
      >
        <select
          aria-label="Reporting period"
          className="select-control"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setRange(
              e.target.value === "Last 7 days"
                ? "7 days"
                : e.target.value === "Last 90 days"
                  ? "90 days"
                  : "30 days",
            );
          }}
        >
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>Last 90 days</option>
        </select>
        <Button variant="outline" onClick={exportData}>
          <ArrowDownToLine /> Export report
        </Button>
      </PageHeading>
      <DemoNotice text="You’re exploring a demo workspace. All products, identifiers, events, and customer records are Demo Data. Stored in this browser only — no cross-device sync or production database." />
      <div className="metrics-grid">
        {metrics.map((m) => (
          <article key={m.title} className="metric-card">
            <div className="flex items-center justify-between">
              <span>{m.title}</span>
              <div className={cn("metric-icon", m.tone)}>
                <m.icon size={19} />
              </div>
            </div>
            <strong>{m.value}</strong>
            <div className="metric-bottom">
              <span
                className={m.title === "After-sales requests" ? "text-warning" : "text-primary"}
              >
                {m.title === "Product scans" && <ArrowUpRight size={13} />}
                {m.change}
              </span>
            </div>
            <p>{m.note}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="chart-panel">
          <div className="section-head">
            <div>
              <h2>Product engagement</h2>
              <p>Scan activity across your digital product pages</p>
            </div>
            <div className="segmented">
              {["7 days", "30 days", "90 days"].map((r) => (
                <Button
                  key={r}
                  variant="ghost"
                  size="sm"
                  className={range === r ? "selected" : ""}
                  onClick={() => {
                    setRange(r);
                    setPeriod(`Last ${r}`);
                  }}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <strong>{state.visits.toLocaleString()}</strong>
            <span className="text-primary">
              <ArrowUpRight size={14} />
              18.6%
            </span>
            <small>vs. previous period · Demo Data</small>
          </div>
          <div className="scan-chart">
            <div className="chart-y">
              <span>120</span>
              <span>90</span>
              <span>60</span>
              <span>30</span>
              <span>0</span>
            </div>
            <div className="chart-plot">
              <svg
                viewBox="0 0 700 190"
                preserveAspectRatio="none"
                role="img"
                aria-label="Demo scan activity chart"
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
                <polygon points={`0,190 ${points} 700,190`} fill="url(#chart-fill)" />
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="chart-x">
                <span>Oct 16</span>
                <span>Oct 21</span>
                <span>Oct 26</span>
                <span>Oct 31</span>
                <span>Nov 5</span>
                <span>Nov 10</span>
                <span>Nov 14</span>
              </div>
            </div>
          </div>
          <div className="chart-legend">
            <span /> Product scans <small>Illustrative demo analytics</small>
          </div>
        </section>
        <section className="journey-panel">
          <div className="section-head">
            <div>
              <h2>Your product journey</h2>
              <p>From a scan to a lasting connection</p>
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
                  <strong>{s.label}</strong>
                  <p>{s.detail}</p>
                  <span>{s.done ? "Completed" : `Step ${i + 1}`}</span>
                </div>
                {s.done && <Check size={15} className="text-primary ml-auto" />}
              </div>
            ))}
          </div>
          <Button variant="outline" asChild className="w-full mt-5">
            <Link to="/p/$slug" params={{ slug: "airpure-mini" }}>
              Explore consumer experience <ArrowUpRight />
            </Link>
          </Button>
          <span className="journey-foot">
            <Globe2 size={13} /> Designed for the European market
          </span>
        </section>
      </div>
      <section className="product-section">
        <div className="section-head">
          <div>
            <h2>
              Your products <span className="count-pill">{state.products.length}</span>
            </h2>
            <p>Digital identities that connect your brand to your customers</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/products">
              <Plus /> Add product
            </Link>
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>PRODUCT ID / SKU</th>
                <th>MARKET</th>
                <th>STATUS</th>
                <th>SCANS</th>
                <th>LAST PUBLISHED</th>
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
                        <small>{p.draft.brand} · Smart home</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="table-mono">{p.draft.model}</span>
                    <small>{p.draft.sku}</small>
                  </td>
                  <td>
                    <span>🇩🇪 Germany</span>
                    <small>European Union</small>
                  </td>
                  <td>
                    <Status value={p.published ? "Published" : "Draft"} />
                  </td>
                  <td className="font-medium">
                    {p.published ? state.visits.toLocaleString() : "—"}
                  </td>
                  <td>
                    {p.published
                      ? new Date(p.published.publishedAt || "").toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                    <small>Demo Data</small>
                  </td>
                  <td>
                    <Button variant="ghost" size="icon" asChild title="Edit product">
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
          Manage all products <ArrowRight size={14} />
        </Link>
      </section>
      <div className="lower-grid">
        <section>
          <div className="section-head">
            <div>
              <h2>Recent activity</h2>
              <p>The latest moments in your workspace</p>
            </div>
            <Link to="/admin/after-sales" className="small-link">
              View all <ArrowRight size={14} />
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
                    ? "New support request"
                    : r.kind === "Warranty"
                      ? "Warranty registered"
                      : "New event registration"}
                </strong>
                <p>
                  {r.name} · {r.kind === "Event" ? "Berlin community event" : "AirPure Mini"}
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
            <span className="demo-label">LOOKING AHEAD</span>
          </div>
          <h2>A more transparent product future.</h2>
          <p>
            Start organizing your product information for the next chapter of digital product
            passports.
          </p>
          <Button variant="outline" asChild>
            <Link to="/admin/dpp">
              Explore DPP Ready <ArrowRight />
            </Link>
          </Button>
          <small>Demo only. Not a declaration of EU DPP compliance.</small>
        </section>
      </div>
    </>
  );
}
export function Products({ contentOnly = false }: { contentOnly?: boolean }) {
  const { state, update, ready } = useDemo();
  const [selected, setSelected] = useState("demo-prod-airpure-001");
  const entry = state.products.find((p) => p.draft.id === selected);
  const [form, setForm] = useState<Product>(entry?.draft || demoProduct);
  const [locale, setLocale] = useState<Locale>("en");
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
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
    update((s) => {
      const draft = saveDraft(s, form);
      return publish ? publishProduct(draft, form) : draft;
    });
    setDirty(false);
    toast.success(
      publish
        ? "Product published. Consumer page is now updated."
        : "Draft saved. Consumer page is unchanged.",
    );
  }
  function create() {
    const id = `demo-prod-${crypto.randomUUID()}`;
    const p = {
      ...structuredClone(demoProduct),
      id,
      slug: `product-${id.slice(-8)}`,
      name: "Untitled product",
      sku: "",
      gtin: "",
      asin: "",
      serial: "",
    };
    update((s) => saveDraft(s, p));
    setSelected(id);
    setForm(p);
    setDirty(false);
  }
  async function imageFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1500000) {
      toast.error("Choose an image smaller than 1.5 MB for this local demo.");
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
        title={contentOnly ? "Product content" : "Products"}
        subtitle={
          contentOnly
            ? "Useful information, in your customers’ own language."
            : "One product identity. Every customer touchpoint."
        }
      >
        {!contentOnly && (
          <Button onClick={create}>
            <Plus /> Create product
          </Button>
        )}
      </PageHeading>
      <DemoNotice />
      <div className="editor-layout">
        <aside className="product-picker">
          <div className="search-box">
            <Search size={16} />
            <Input
              aria-label="Search products"
              placeholder="Search products…"
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
                  <small>{p.published ? "Published" : "Draft"} · Demo Data</small>
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
                {form.id} · {dirty ? "Unsaved changes" : "Saved draft"}
              </p>
            </div>
            <Status value={entry?.published ? "Published" : "Draft"} />
          </div>
          <div className="form-grid">
            {!contentOnly && (
              <>
                <div className="product-image-editor">
                  <img src={form.image} alt={form.name} width={220} height={220} />
                  <label className="file-control">
                    <Plus size={15} /> Change image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => imageFile(e.target.files?.[0])}
                    />
                  </label>
                </div>
                <div className="grid gap-4">
                  <TextField
                    label="Product name"
                    value={form.name}
                    onChange={(v) => change("name", v)}
                    required
                  />
                  <TextField
                    label="Brand"
                    value={form.brand}
                    onChange={(v) => change("brand", v)}
                  />
                  <TextField
                    label="Model"
                    value={form.model}
                    onChange={(v) => change("model", v)}
                  />
                </div>
                <TextField label="SKU" value={form.sku} onChange={(v) => change("sku", v)} />
                <TextField
                  label="GTIN · Demo Data"
                  value={form.gtin}
                  onChange={(v) => change("gtin", v)}
                />
                <TextField
                  label="ASIN · Demo Data"
                  value={form.asin}
                  onChange={(v) => change("asin", v)}
                />
                <TextField
                  label="Brand serial number · Demo Data"
                  value={form.serial}
                  onChange={(v) => change("serial", v)}
                />
              </>
            )}
            <div className="col-span-full flex items-center justify-between mt-3">
              <h3>Localized content</h3>
              <select
                className="select-control"
                aria-label="Content language"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
              </select>
            </div>
            {(["description", "manual", "faq"] as const).map((k) => (
              <div key={k} className="col-span-full">
                <Field
                  label={
                    k === "description"
                      ? "Product description"
                      : k === "manual"
                        ? "User manual · Instructions or HTTPS link"
                        : "Frequently asked questions"
                  }
                >
                  <textarea
                    aria-label={
                      k === "description"
                        ? "Product description"
                        : k === "manual"
                          ? "User manual"
                          : "Frequently asked questions"
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
                label="Video link · HTTPS URL (optional)"
                type="url"
                value={form.video}
                onChange={(v) => change("video", v)}
              />
            </div>
          </div>
          <div className="editor-footer">
            <p>Only published versions appear on consumer pages.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save()}>
                Save draft
              </Button>
              <Button disabled={!form.name.trim()} onClick={() => save(true)}>
                <Check /> Publish product
              </Button>
            </div>
          </div>
          {entry?.published && (
            <Button variant="link" asChild>
              <Link to="/p/$slug" params={{ slug: form.slug }}>
                View published product <ExternalLink />
              </Link>
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
export function AfterSales() {
  const { state, update } = useDemo();
  const [filter, setFilter] = useState("All records");
  const [query, setQuery] = useState("");
  const records = state.records.filter(
    (r) =>
      r.kind !== "Event" &&
      (filter === "All records" || r.kind === filter) &&
      `${r.name} ${r.email} ${r.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading title="After-sales" subtitle="Thoughtful support, beyond the first purchase." />
      <DemoNotice />
      <div className="section-head mt-7">
        <div className="segmented">
          {["All records", "Warranty", "Support"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant="ghost"
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="search-box">
          <Search size={16} />
          <Input
            aria-label="Search customer records"
            placeholder="Search demo records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>RECORD</th>
              <th>CUSTOMER · DEMO DATA</th>
              <th>TYPE</th>
              <th>DETAILS</th>
              <th>DATE</th>
              <th>STATUS</th>
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
                <td>{r.kind}</td>
                <td className="details-cell">
                  {r.details}
                  <small>{r.serial}</small>
                </td>
                <td>{r.date}</td>
                <td>
                  {r.kind === "Support" ? (
                    <select
                      className="select-control"
                      aria-label={`Status ${r.id}`}
                      value={r.status}
                      onChange={(e) => {
                        const status = e.target.value as typeof r.status;
                        update((s) => ({
                          ...s,
                          records: s.records.map((v) => (v.id === r.id ? { ...v, status } : v)),
                        }));
                        toast.success("Ticket status updated");
                      }}
                    >
                      <option>New</option>
                      <option>In progress</option>
                      <option>Resolved</option>
                    </select>
                  ) : (
                    <Status value="New" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && <p className="empty-state">No records match your search.</p>}
      </div>
      <p className="text-sm text-muted-foreground mt-5">
        Warranty registration never creates marketing consent. Marketing permissions are managed
        separately.
      </p>
    </>
  );
}
export function Marketing() {
  const { state, update } = useDemo();
  const [edit, setEdit] = useState<Campaign | null>(null);
  const [lang, setLang] = useState<Locale>("en");
  const [tab, setTab] = useState("Events");
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
    toast.success(status === "Published" ? "Event published" : "Event draft saved");
  };
  return (
    <>
      <PageHeading
        title="Marketing & Community"
        subtitle="Meaningful local moments. Lasting brand connections."
      >
        <Button onClick={create}>
          <Plus /> Create event
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
            {t}
          </Button>
        ))}
      </div>
      {tab === "Events" ? (
        <div className="event-grid">
          {state.campaigns.map((e) => (
            <article className="event-card" key={e.id}>
              <div className="event-cover">
                <Users size={36} />
                <span>{e.city.split(",")[0]}</span>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{e.date} · Demo Data</span>
                  <Status value={e.status} />
                </div>
                <h2 className="mt-4">{e.title.en}</h2>
                <p className="my-3 text-sm text-muted-foreground">{e.description.en}</p>
                <span className="text-xs text-muted-foreground">
                  {state.records.filter((r) => r.eventId === e.id).length} registrations
                </span>
                <div className="flex gap-2 mt-5">
                  <Button variant="outline" size="sm" onClick={() => setEdit(e)}>
                    Edit event
                  </Button>
                  {e.status === "Published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          campaigns: s.campaigns.map((v) =>
                            v.id === e.id ? { ...v, status: "Closed" } : v,
                          ),
                        }));
                        toast.success("Event closed. Registrations are disabled.");
                      }}
                    >
                      Close event
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EMAIL · DEMO DATA</th>
                <th>{tab === "Registrations" ? "ATTENDEE" : "CONSENT"}</th>
                <th>{tab === "Registrations" ? "EVENT" : "UPDATED"}</th>
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
                        <td>{r.details}</td>
                      </tr>
                    ))
                : state.consents.map((c) => (
                    <tr key={c.email}>
                      <td>{c.email}</td>
                      <td>
                        <Status value={c.active ? "Active" : "Withdrawn"} />
                      </td>
                      <td>{new Date(c.updatedAt).toLocaleDateString("en-GB")}</td>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{edit?.title.en}</DialogTitle>
          <DialogDescription>Fictional local community event · Demo Data</DialogDescription>
          {edit && (
            <>
              <select
                className="select-control"
                aria-label="Event language"
                value={lang}
                onChange={(e) => setLang(e.target.value as Locale)}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
              </select>
              <TextField
                label="Event title"
                value={edit.title[lang]}
                onChange={(v) => setEdit({ ...edit, title: { ...edit.title, [lang]: v } })}
              />
              <TextField
                label="City"
                value={edit.city}
                onChange={(v) => setEdit({ ...edit, city: v })}
              />
              <TextField
                label="Date"
                type="date"
                value={edit.date}
                onChange={(v) => setEdit({ ...edit, date: v })}
              />
              <Field label="Description">
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => save("Draft")}>
                  Save draft
                </Button>
                <Button
                  disabled={!edit.title[lang].trim() || !edit.date}
                  onClick={() => save("Published")}
                >
                  Publish event
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
  const { state } = useDemo();
  return (
    <>
      <PageHeading
        title="Product transparency"
        subtitle="A clear identity. An honest verification journey."
      />
      <DemoNotice />
      <div className="info-columns mt-7">
        <section className="info-block">
          <ShieldCheck className="text-primary mb-4" size={28} />
          <h2>Amazon Transparency</h2>
          <p>
            Official Transparency codes are issued through Amazon’s program. Consumers should scan
            an official code using the Amazon Shopping or Transparency app.
          </p>
          <span className="info-warning">
            No Amazon API connected. No official verification result is provided.
          </span>
          <a
            href="https://www.amazon.com/transparency"
            target="_blank"
            rel="noreferrer"
            className="section-link"
          >
            Amazon official information <ExternalLink size={14} />
          </a>
        </section>
        <section className="info-block">
          <QrCode className="text-info mb-4" size={28} />
          <h2>Brand-owned serial codes</h2>
          <p>
            NOVA Home’s demo serial numbers connect products to this digital experience. They are
            not Amazon Transparency codes and cannot prove authenticity.
          </p>
          <span className="info-warning">
            Demo mappings only. A serial match is not official certification.
          </span>
        </section>
      </div>
      <h2 className="mt-8 mb-5">
        Product identity mappings <span className="demo-label">DEMO DATA</span>
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>UNIQUE ID</th>
              <th>ASIN / GTIN</th>
              <th>SKU / BRAND SERIAL</th>
              <th>OFFICIAL CODE</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.draft.id}>
                <td>{p.draft.name}</td>
                <td className="table-mono">{p.draft.id}</td>
                <td>
                  {p.draft.asin}
                  <small>{p.draft.gtin}</small>
                </td>
                <td>
                  {p.draft.sku}
                  <small>{p.draft.serial}</small>
                </td>
                <td>Not connected</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Dpp() {
  const { state, update } = useDemo();
  const [id, setId] = useState(demoProduct.id);
  const entry = state.products.find((p) => p.draft.id === id);
  const [form, setForm] = useState(entry?.draft || demoProduct);
  useEffect(() => {
    if (entry) setForm(entry.draft);
  }, [id, state.products]);
  return (
    <>
      <PageHeading
        title="DPP Ready"
        subtitle="Organize today’s product data for tomorrow’s transparency."
      />
      <DemoNotice text="DPP Ready is a demonstration of future product passport fields. It does not represent compliance with statutory EU Digital Product Passport requirements." />
      <div className="dpp-heading">
        <Leaf size={34} />
        <div>
          <h2>Product information, thoughtfully connected.</h2>
          <p>Materials, manufacturer and technical specifications in one place.</p>
        </div>
        <span className="demo-label">DEMO DATA</span>
      </div>
      <section className="editor max-w-3xl">
        <Field label="Product">
          <select className="select-control" value={id} onChange={(e) => setId(e.target.value)}>
            {state.products.map((p) => (
              <option key={p.draft.id} value={p.draft.id}>
                {p.draft.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 mt-6">
          {(["manufacturer", "materials", "specs"] as const).map((k) => (
            <TextField
              key={k}
              label={
                k === "specs"
                  ? "Technical specifications"
                  : k === "materials"
                    ? "Materials · Demo Data"
                    : "Manufacturer · Demo Data"
              }
              value={form[k]}
              onChange={(v) => setForm({ ...form, [k]: v })}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <span className="status status-muted">Carbon footprint · Future field</span>
            <span className="status status-muted">Recyclability · Future field</span>
            <span className="status status-muted">EU passport ID · Not assigned</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                update((s) => saveDraft(s, form));
                toast.success("DPP draft saved");
              }}
            >
              Save draft
            </Button>
            <Button
              onClick={() => {
                update((s) => publishProduct(saveDraft(s, form), form));
                toast.success("DPP demo information published");
              }}
            >
              Publish product
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
