import { createContext, useContext, useState, type ReactNode } from "react";

const KEY = "lam.hideValues";

type Privacy = { hidden: boolean; toggle: () => void };

const PrivacyContext = createContext<Privacy | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(KEY) === "1");

  function toggle() {
    setHidden((current) => {
      const next = !current;
      sessionStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): Privacy {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy precisa estar dentro de um PrivacyProvider");
  }
  return context;
}