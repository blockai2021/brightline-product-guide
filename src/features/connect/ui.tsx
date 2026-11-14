import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
export function Status({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "status",
        ["Published", "Resolved", "Active"].includes(value)
          ? "status-success"
          : ["Draft", "In progress"].includes(value)
            ? "status-warning"
            : value === "Closed"
              ? "status-muted"
              : "status-info",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "onChange"
>) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </Field>
  );
}
export function DemoNotice({ consumer = false, text }: { consumer?: boolean; text?: string }) {
  return (
    <div className={cn("demo-notice", consumer && "consumer-notice")}>
      <span className="demo-label">DEMO DATA</span>
      <span>
        {text ||
          "Browser-local prototype. Data stays on this browser, cannot sync across devices, and is not a production database. Use fictional details only."}
      </span>
    </div>
  );
}
