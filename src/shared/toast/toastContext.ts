import { createContext, useContext } from "react";

export type ToastTone = "error" | "info" | "success";
export type Toast = { id: number; message: string; tone: ToastTone };
export type ToastApi = { show: (message: string, tone?: ToastTone) => void };

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast precisa estar dentro de um ToastProvider");
  }
  return context;
}
