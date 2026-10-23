import { useState, type ReactNode } from "react";
import { PrivacyContext } from "./privacyContext";

const KEY = "lam.hideValues";

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
