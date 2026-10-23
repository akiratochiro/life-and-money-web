import { createContext, useContext } from "react";

export type Privacy = { hidden: boolean; toggle: () => void };

export const PrivacyContext = createContext<Privacy | null>(null);

export function usePrivacy(): Privacy {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy precisa estar dentro de um PrivacyProvider");
  }
  return context;
}
