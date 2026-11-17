import { useEffect, useState } from "react";
import { campaignCoverStyle } from "./campaign-style";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Fan,
  Globe2,
  Headphones,
  Home,
  Leaf,
  MapPin,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Users,
  Wind,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDemo } from "./store";
import { Field, TextField } from "./ui";
import {
  findUnitByIdentity,
  registerEvent,
  setConsent,
  type Campaign,
  type Locale,
  type RecordEntry,
} from "./domain";
import { copy } from "./translations";
import { useLanguage } from "./language";
import { cn } from "@/lib/utils";
import { resolvePublishedProduct } from "./digital-link-qr";
function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function Consumer({
  slug,
  gtin,
  identitySerial,
  brandSlug,
}: {
  slug?: string;
  gtin?: string;
  identitySerial?: string;
  brandSlug?: string;
}) {
  const { state, update, ready } = useDemo();
  const [lang, setLang] = useLanguage("consumer");
  const [tab, setTab] = useState("product");
  const [modal, setModal] = useState<"Warranty" | "Support" | "Event" | "Manual" | null>(null);
  const [event, setEvent] = useState<Campaign | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [serial, setSerial] = useState("");
  const [details, setDetails] = useState("");
  const [optin, setOptin] = useState(false);
  const [consentEmail, setConsentEmail] = useState("");
  const [error, setError] = useState("");
  const t = (key: string) => copy[lang]?.[key] || key;
  const identityUnit =
    gtin && identitySerial ? findUnitByIdentity(state, gtin, identitySerial) : undefined;
  const product = resolvePublishedProduct(state, { slug, gtin, serial: identitySerial, brandSlug });
  const identity = identityUnit
    ? state.identities.find((item) => item.unitId === identityUnit.id)
    : undefined;
  const consent = state.consents.find((c) => c.email === consentEmail);
  useEffect(() => {
    if (ready && product) update((s) => ({ ...s, visits: s.visits + 1 }));
  }, [ready, slug, gtin, identitySerial, brandSlug]);
  function switchTab(value: string) {
    setTab(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function open(kind: typeof modal, campaign?: Campaign) {
    setError("");
    setModal(kind);
    setEvent(campaign || null);
    setSerial(identityUnit?.serial || "");
    setDetails("");
  }
  function validateEmail(value: string) {
    return /^[^\s@]+@example\.test$/i.test(value);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !modal || modal === "Manual") return;
    if (!validateEmail(email)) {
      setError(t("invalidEmail"));
      return;
    }
    const selectedUnit =
      modal === "Event"
        ? undefined
        : identityUnit ||
          state.units.find((unit) => unit.productId === product.id && unit.serial === serial);
    if (modal !== "Event" && !selectedUnit) {
      setError(t("This serial number is not registered to this product."));
      return;
    }
    const record: RecordEntry = {
      id: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      ...(selectedUnit ? { unitId: selectedUnit.id } : {}),
      name: `Demo · ${name}`,
      email,
      serial,
      date: new Date().toISOString().slice(0, 10),
      kind: modal,
      details:
        modal === "Event"
          ? event?.title[lang] || ""
          : modal === "Warranty"
            ? `Purchase date: ${details}`
            : details,
      status: "New",
      ...(modal === "Event" && event ? { eventId: event.id } : {}),
    };
    if (modal === "Event") {
      if (!event || state.campaigns.find((c) => c.id === event.id)?.status !== "Published") {
        setError(t("closed"));
        return;
      }
      if (state.records.some((r) => r.eventId === event.id && r.email === email)) {
        setError(t("existing"));
        return;
      }
      update((s) => registerEvent(s, record));
    } else update((s) => ({ ...s, records: [record, ...s.records] }));
    toast.success(t(modal === "Event" ? "registered" : "submitted"));
    setModal(null);
  }
  function marketing(active: boolean) {
    if (!validateEmail(consentEmail)) {
      toast.error(t("invalidEmail"));
      return;
    }
    if (active && !optin) {
      toast.error(t("consentNeed"));
      return;
    }
    update((s) => setConsent(s, consentEmail, active));
    if (!active) setOptin(false);
    toast.success(t("savedConsent"));
  }
  function downloadManual() {
    if (!product) return;
    const url = URL.createObjectURL(
      new Blob([`${product.brand} — ${product.name}\nDemo Data\n\n${product.manual[lang]}`], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.slug}-manual-${lang}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const nav = [
    { key: "product", icon: Home },
    { key: "guides", icon: BookOpen },
    { key: "support", icon: Headphones },
    { key: "community", icon: Users },
  ];
  return (
    <div className="consumer-shell">
      <header className="consumer-header">
        {product ? (
          <Link to="/p/$slug" params={{ slug: product.slug }} className="nova-logo">
            {product.brand}
          </Link>
        ) : (
          <span className="nova-logo">iCode Connect</span>
        )}
        <div className="consumer-desktop-nav">
          {nav.map((n) => (
            <Button
              variant="ghost"
              key={n.key}
              className={tab === n.key ? "text-primary" : ""}
              onClick={() => switchTab(n.key)}
            >
              {t(n.key)}
            </Button>
          ))}
        </div>
        <label className="language-picker">
          <Globe2 size={16} />
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Locale)}
          >
            <option value="en">EN</option>
            <option value="de">DE</option>
            <option value="zh">中文</option>
          </select>
        </label>
      </header>
      {!product ? (
        <main className="consumer-body">
          <div className="empty-state">
            <BoxIcon />
            <h1>{t("unavailable")}</h1>
            <Button variant="outline" asChild>
              <Link to="/admin/products">{t("admin")}</Link>
            </Button>
          </div>
        </main>
      ) : (
        <>
          {tab === "product" && (
            <>
              <section className="consumer-hero">
                <img
                  src={product.image}
                  alt={`${product.brand} ${product.name}`}
                  width={1024}
                  height={1024}
                />
                <div className="consumer-hero-copy">
                  <span className="eyebrow">{t("smart")}</span>
                  <h1>{product.name}</h1>
                  <p>{t("welcome")}</p>
                  <span className="consumer-hero-brand">NOVA HOME · DEMO DATA</span>
                  {identityUnit && (
                    <span className="info-warning">
                      {t("Unit identity resolved")}: {identityUnit.serial} ·{" "}
                      {t("Identification is not proof of authenticity")}
                    </span>
                  )}
                </div>
                <div className="hero-bottom">
                  <span>
                    <Wind size={17} /> {t("scan")}
                  </span>
                  <span>01 / 01</span>
                </div>
              </section>
              <main className="consumer-body">
                <section className="consumer-intro">
                  <span className="eyebrow">{t("brand")}</span>
                  <h2>{t("clean")}</h2>
                  <p>{product.description[lang]}</p>
                  <div className="spec-strip">
                    <div>
                      <Wind size={20} />
                      <strong>25 m²</strong>
                      <span>{t("room")}</span>
                    </div>
                    <div>
                      <Fan size={20} />
                      <strong>22 dB</strong>
                      <span>{t("quiet")}</span>
                    </div>
                    <div>
                      <Leaf size={20} />
                      <strong>H13</strong>
                      <span>{t("filter")}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Demo Data · {product.specs}</span>
                </section>
                <section className="consumer-services">
                  <h2>{t("home")}</h2>
                  <div className="service-grid">
                    {[
                      {
                        icon: BookOpen,
                        title: "manual",
                        detail: "guideSub",
                        action: () => switchTab("guides"),
                      },
                      {
                        icon: ShieldCheck,
                        title: "warranty",
                        detail: "warrantySub",
                        action: () => open("Warranty"),
                      },
                      {
                        icon: Headphones,
                        title: "service",
                        detail: "serviceSub",
                        action: () => open("Support"),
                      },
                      {
                        icon: Users,
                        title: "community",
                        detail: "localSub",
                        action: () => switchTab("community"),
                      },
                    ].map((s) => (
                      <Button
                        key={s.title}
                        variant="ghost"
                        className="service-item"
                        onClick={s.action}
                      >
                        <s.icon size={24} />
                        <span>
                          <strong>{t(s.title)}</strong>
                          <small>{t(s.detail)}</small>
                        </span>
                        <ChevronRight size={18} />
                      </Button>
                    ))}
                  </div>
                </section>
                <div className="consumer-identity-links">
                  <Button variant="ghost" onClick={() => switchTab("identity")}>
                    <QrCode />
                    {t("identity")}
                    <ArrowUpRight />
                  </Button>
                  <Button variant="ghost" onClick={() => switchTab("dpp")}>
                    <Leaf />
                    {t("dpp")}
                    <ArrowUpRight />
                  </Button>
                </div>
              </main>
            </>
          )}
          {tab !== "product" && (
            <main className="consumer-body consumer-inner">
              <Button variant="ghost" className="back-button" onClick={() => switchTab("product")}>
                <ArrowRight className="rotate-180" />
                {t("back")}
              </Button>
              {tab === "guides" && (
                <>
                  <span className="eyebrow">{t("guideInfo")}</span>
                  <h1>{t("manual")}</h1>
                  <p className="consumer-subtitle">{t("guideSub")}</p>
                  <div className="manual-band">
                    <BookOpen size={35} />
                    <div>
                      <h2>{product.name}</h2>
                      <p>
                        {t("instructions")} · {lang.toUpperCase()} · Demo Data
                      </p>
                    </div>
                    <Button onClick={() => open("Manual")}>
                      {t("readManual")}
                      <ArrowRight />
                    </Button>
                  </div>
                  <section className="consumer-section">
                    <h2>{t("faq")}</h2>
                    {product.faq[lang]
                      .split("\n")
                      .filter(Boolean)
                      .map((faq, i) => (
                        <details className="faq-item" key={i}>
                          <summary>
                            {faq.split(/[?？]/)[0]}
                            {lang === "zh" ? "？" : "?"}
                          </summary>
                          <p>
                            {faq.includes("？")
                              ? faq.split("？").slice(1).join("？")
                              : faq.split("?").slice(1).join("?")}
                          </p>
                        </details>
                      ))}
                  </section>
                  <section className="consumer-section">
                    <h2>{t("video")}</h2>
                    {safeUrl(product.video) ? (
                      <a
                        href={safeUrl(product.video)}
                        target="_blank"
                        rel="noreferrer"
                        className="video-link"
                      >
                        <PlayCircle size={28} />
                        {t("video")}
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <p className="text-muted-foreground mt-4">{t("noVideo")}</p>
                    )}
                  </section>
                </>
              )}
              {tab === "support" && (
                <>
                  <span className="eyebrow">NOVA HOME CARE</span>
                  <h1>{t("help")}</h1>
                  <p className="consumer-subtitle">{t("helpSub")}</p>
                  <div className="support-options">
                    <section>
                      <ShieldCheck size={32} />
                      <h2>{t("warranty")}</h2>
                      <p>{t("warrantySub")}</p>
                      <Button onClick={() => open("Warranty")}>
                        {t("warranty")}
                        <ArrowRight />
                      </Button>
                    </section>
                    <section>
                      <Headphones size={32} />
                      <h2>{t("service")}</h2>
                      <p>{t("serviceSub")}</p>
                      <Button variant="outline" onClick={() => open("Support")}>
                        {t("service")}
                        <ArrowRight />
                      </Button>
                    </section>
                  </div>
                  <p className="consumer-policy">{t("policy")}</p>
                </>
              )}
              {tab === "community" && (
                <>
                  <span className="eyebrow">NOVA HOME COMMUNITY</span>
                  <h1>{t("local")}</h1>
                  <p className="consumer-subtitle">{t("localSub")}</p>
                  <div className="consumer-events">
                    {state.campaigns
                      .filter((e) => e.status !== "Draft" && !e.deletedAt)
                      .map((e) => (
                        <article className="consumer-event" key={e.id}>
                          <div className="consumer-event-city" style={campaignCoverStyle(e)}>
                            <MapPin size={25} />
                            <span>{e.format === "Online" ? "Online" : e.city.split(",")[0]}</span>
                            <small>DEMO DATA</small>
                          </div>
                          <div className="consumer-event-content">
                            <span className="eyebrow">{e.date}</span>
                            <h2>{e.title[lang]}</h2>
                            <p>{e.description[lang]}</p>
                            <Button variant="outline" onClick={() => open("Event", e)}>
                              {t("eventDetail")}
                              <ArrowRight />
                            </Button>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!state.campaigns.some((e) => e.status !== "Draft" && !e.deletedAt) && <p>{t("empty")}</p>}
                  <section className="consumer-marketing">
                    <Leaf size={26} />
                    <h2>{t("consent")}</h2>
                    <p>{t("consentSub")}</p>
                    <TextField
                      label={t("email")}
                      type="email"
                      placeholder="demo@example.test"
                      value={consentEmail}
                      onChange={setConsentEmail}
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={optin}
                        onChange={(e) => setOptin(e.target.checked)}
                      />
                      <span>{t("optin")}</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={() => marketing(true)}>{t("subscribe")}</Button>
                      <Button variant="outline" onClick={() => marketing(false)}>
                        {t("withdraw")}
                      </Button>
                    </div>
                    {consent && (
                      <p className="consent-state">
                        <CheckCircle2 size={16} />
                        {t(consent.active ? "active" : "withdrawn")}
                      </p>
                    )}
                  </section>
                </>
              )}
              {tab === "identity" && (
                <>
                  <span className="eyebrow">DEMO DATA · NOVA HOME</span>
                  <h1>{t("official")}</h1>
                  <div className="consumer-section">
                    <ShieldCheck size={28} className="text-primary mb-4" />
                    <h2>Amazon Transparency</h2>
                    <p>{t("officialText")}</p>
                    <a
                      href="https://www.amazon.com/transparency"
                      target="_blank"
                      rel="noreferrer"
                      className="section-link"
                    >
                      {t("officialLink")}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="consumer-section">
                    <QrCode size={28} className="text-primary mb-4" />
                    <h2>{t("brandCode")}</h2>
                    <p>{t("brandText")}</p>
                    <dl className="identity-list">
                      {[
                        [t("productId"), product.id],
                        ["SKU", product.sku],
                        ["GTIN", product.gtin],
                        ["ASIN", product.asin],
                        [
                          t("serial"),
                          identityUnit?.serial || t("Select a registered unit for service"),
                        ],
                        [
                          t("Identity status"),
                          identity
                            ? t("Resolved · identity is not proof of authenticity")
                            : t("Model-level page"),
                        ],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>
                            {v || "—"} <span>Demo Data</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </>
              )}
              {tab === "dpp" && (
                <>
                  <span className="eyebrow">DPP READY · DEMO DATA</span>
                  <h1>{t("future")}</h1>
                  <div className="dpp-disclaimer">
                    <Leaf size={26} />
                    <p>{t("futureText")}</p>
                  </div>
                  <dl className="identity-list">
                    {[
                      [t("manufacturer"), product.manufacturer],
                      [t("materials"), product.materials],
                      [t("specs"), product.specs],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>
                          {v}
                          <span>Demo Data</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </main>
          )}
          <Dialog
            open={modal !== null}
            onOpenChange={(v) => {
              if (!v) setModal(null);
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogTitle>
                {modal === "Manual"
                  ? `${product.name} · ${t("manual")}`
                  : modal === "Event"
                    ? event?.title[lang]
                    : t(modal === "Warranty" ? "warranty" : "service")}
              </DialogTitle>
              <DialogDescription>
                {modal === "Manual" ? "Demo Data" : t("demoForm")}
              </DialogDescription>
              {modal === "Manual" ? (
                <>
                  <p className="whitespace-pre-line leading-7">{product.manual[lang]}</p>
                  {safeUrl(product.manual[lang]) ? (
                    <a
                      href={safeUrl(product.manual[lang])}
                      target="_blank"
                      rel="noreferrer"
                      className="section-link"
                    >
                      {t("openManual")}
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <Button onClick={downloadManual}>{t("download")}</Button>
                  )}
                </>
              ) : (
                <form className="grid gap-4" onSubmit={submit}>
                  {modal === "Event" && event && (
                    <div className="event-modal-details">
                      {campaignCoverStyle(event) && (
                        <div className="event-modal-banner" style={campaignCoverStyle(event)}>
                          {event.title[lang]}
                        </div>
                      )}
                      <p>{event.description[lang]}</p>
                      <span>
                        <MapPin size={15} />
                        {event.city}
                      </span>
                      <span>
                        <CalendarDays size={15} />
                        {event.date}
                      </span>
                    </div>
                  )}
                  {modal === "Event" &&
                  state.campaigns.find((c) => c.id === event?.id)?.status !== "Published" ? (
                    <p className="info-warning">{t("closed")}</p>
                  ) : (
                    <>
                      <TextField
                        label={t("name")}
                        required
                        maxLength={80}
                        value={name}
                        onChange={setName}
                        placeholder="Demo Alex"
                      />
                      <TextField
                        label={t("email")}
                        type="email"
                        required
                        value={email}
                        onChange={setEmail}
                        placeholder="alex@example.test"
                      />
                      {modal !== "Event" && (
                        <TextField
                          label={t("serial")}
                          required
                          value={serial}
                          onChange={setSerial}
                          disabled={Boolean(identityUnit)}
                        />
                      )}
                      {modal === "Warranty" && (
                        <TextField
                          label={t("purchase")}
                          type="date"
                          required
                          value={details}
                          onChange={setDetails}
                        />
                      )}
                      {modal === "Support" && (
                        <Field label={t("details")}>
                          <textarea
                            className="textarea-control"
                            required
                            maxLength={2000}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                          />
                        </Field>
                      )}
                      <p className="text-xs text-muted-foreground">{t("policy")}</p>
                      {error && (
                        <p role="alert" className="text-destructive text-sm">
                          {error}
                        </p>
                      )}
                      <Button type="submit">
                        {t(modal === "Event" ? "register" : "submit")}
                        <ArrowRight />
                      </Button>
                    </>
                  )}
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      <footer className="consumer-footer">
        <div className="nova-logo">
          NOVA<span>HOME</span>
        </div>
        <p>{t("tag")}</p>
        <div className="consumer-demo">
          <span className="demo-label">DEMO DATA</span>
          <p>{t("demo")}</p>
        </div>
        <Button variant="link" size="sm" asChild>
          <Link to="/admin">
            {t("admin")}
            <ArrowUpRight />
          </Link>
        </Button>
        <small>© 2026 Product iCode Connect</small>
      </footer>
      <nav className="consumer-mobile-nav">
        {nav.map((n) => (
          <Button
            variant="ghost"
            key={n.key}
            className={cn(tab === n.key && "selected")}
            onClick={() => switchTab(n.key)}
          >
            <n.icon size={20} />
            <span>{t(n.key)}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}
function BoxIcon() {
  return <QrCode size={35} className="mx-auto mb-5 text-primary" />;
}
