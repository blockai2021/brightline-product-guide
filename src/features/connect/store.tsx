import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DemoState } from "./domain";
import { initialState } from "./seed";
const KEY = "icode-connect-demo-v1";
type Store = {
  state: DemoState;
  ready: boolean;
  update: (change: (state: DemoState) => DemoState) => void;
};
const Context = createContext<Store | undefined>(undefined);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const value = JSON.parse(raw);
          if (
            Array.isArray(value.products) &&
            Array.isArray(value.records) &&
            Array.isArray(value.campaigns) &&
            Array.isArray(value.consents)
          )
            setState(value);
        }
      } catch {
        /* Keep demo seed when storage is unavailable. */
      }
    };
    read();
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === KEY) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function update(change: (state: DemoState) => DemoState) {
    setState((current) => {
      const next = change(current);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* In-memory demo remains usable. */
      }
      return next;
    });
  }
  return <Context.Provider value={{ state, ready, update }}>{children}</Context.Provider>;
}
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw new Error("DemoProvider required");
  return store;
}
