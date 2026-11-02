import { createContext, useContext } from "react";

export type Celebrate = () => void;

export const CelebrateContext = createContext<Celebrate | null>(null);

export function useCelebrate(): Celebrate {
  const context = useContext(CelebrateContext);
  if (!context) {
    throw new Error("useCelebrate precisa estar dentro de um CelebrateProvider");
  }
  return context;
}
