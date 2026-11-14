import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PrintJob } from "./printing";

const KEY = "icode-connect-print-jobs-v1";
type PrintStore = {
  jobs: PrintJob[];
  ready: boolean;
  storageError: boolean;
  save: (jobs: PrintJob[]) => void;
};
const Context = createContext<PrintStore | undefined>(undefined);
export function PrintJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (
          !Array.isArray(parsed) ||
          parsed.some((j) => !j || j.formatVersion !== 1 || !Array.isArray(j.rows) || !j.files)
        )
          throw new Error("Invalid printing storage");
        setJobs(parsed);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  function save(next: PrintJob[]) {
    // Fail closed: never claim a frozen job was saved when browser storage failed.
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      setStorageError(true);
      throw new Error("storage");
    }
    setJobs(next);
    setStorageError(false);
  }
  return (
    <Context.Provider value={{ jobs, ready, storageError, save }}>{children}</Context.Provider>
  );
}
export function usePrintJobs() {
  const value = useContext(Context);
  if (!value) throw new Error("PrintJobsProvider required");
  return value;
}
