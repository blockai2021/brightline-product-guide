import { useEffect, useState } from "react";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildInfo, environmentForHost, versionReport, type DemoEnvironment } from "./build-info";
import { useAdminTranslation } from "./language";

export function BuildInfoPanel() {
  const { t, language } = useAdminTranslation();
  const [open, setOpen] = useState(false);
  const [environment, setEnvironment] = useState<DemoEnvironment>("Unknown");
  const [url, setUrl] = useState("Unknown");
  const [manualCopy, setManualCopy] = useState(false);
  useEffect(() => {
    setEnvironment(environmentForHost(window.location.hostname));
    setUrl(`${window.location.origin}/admin`);
  }, []);
  const report = versionReport(buildInfo, environment, language, url);
  async function copyVersion() {
    try {
      await navigator.clipboard.writeText(report);
      toast.success(t("Build.copied"));
      setManualCopy(false);
    } catch {
      setOpen(true);
      setManualCopy(true);
      toast.error(t("Build.copyFailed"));
    }
  }
  return (
    <section className="build-info" aria-label={t("Build.title")}>
      <div className="build-info-row">
        <span className="font-medium text-foreground">Browser-local Demo</span>
        <span>{buildInfo.version}</span>
        <span>{t(`Build.${environment}`)}</span>
        <span title={buildInfo.gitSha}>
          Commit: <code>{buildInfo.gitSha.slice(0, 12)}</code>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Info />
          {t("Build.title")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={t("Build.copy")}
          aria-label={t("Build.copy")}
          onClick={copyVersion}
        >
          <Copy />
        </Button>
      </div>
      <p>{t("Build.limitations")}</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="build-dialog" closeLabel={t("Close")}>
          <DialogTitle>{t("Build.title")}</DialogTitle>
          <DialogDescription>Product iCode Connect · Browser-local Demo</DialogDescription>
          <dl className="build-details">
            <dt>{t("Build.version")}</dt>
            <dd>
              {buildInfo.version}
              {!buildInfo.versionApproved && <small>{t("Build.provisional")}</small>}
            </dd>
            <dt>{t("Build.environment")}</dt>
            <dd>{t(`Build.${environment}`)}</dd>
            <dt>Git Commit SHA</dt>
            <dd>
              <code>{buildInfo.gitSha}</code>
              {buildInfo.gitSha === "Unknown" && <small>{t("Build.noSha")}</small>}
            </dd>
            <dt>{t("Build.builtAt")}</dt>
            <dd>{buildInfo.builtAt}</dd>
            <dt>{t("Build.id")}</dt>
            <dd>
              <code>{buildInfo.buildId}</code>
            </dd>
            <dt>{t("Build.deployedAt")}</dt>
            <dd>{buildInfo.deployedAt}</dd>
          </dl>
          <p className="text-sm text-muted-foreground">{t("Build.limitations")}</p>
          <Button variant="outline" onClick={copyVersion}>
            <Copy />
            {t("Build.copy")}
          </Button>
          {manualCopy && (
            <textarea
              aria-label={t("Build.copy")}
              readOnly
              value={report}
              rows={10}
              className="build-copy-text"
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
