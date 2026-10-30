import { useEffect, useState } from "react";
import { ApiError } from "./problem";

/** "45 s" abaixo de um minuto; "1:05" a partir dele. */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

/**
 * Segundos que faltam para poder tentar de novo depois de um 429, descendo a cada segundo.
 * Devolve 0 quando o erro não é um 429 ou quando a espera acabou.
 *
 * A contagem parte de um prazo absoluto, e não de "menos um" a cada tique: um intervalo do
 * navegador atrasa (aba em segundo plano, celular economizando bateria), e a conta subtraída
 * ficaria para trás do tempo real.
 */
export function useRetryCountdown(error: unknown): number {
  const total = error instanceof ApiError ? (error.retryAfterSeconds ?? 0) : 0;
  const [countdown, setCountdown] = useState({ error, remaining: total });

  // Um erro novo reinicia a contagem já no render, sem esperar um efeito.
  if (countdown.error !== error) {
    setCountdown({ error, remaining: total });
  }

  useEffect(() => {
    if (total <= 0) return;
    const deadline = Date.now() + total * 1_000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
      setCountdown({ error, remaining });
      if (remaining === 0) clearInterval(timer);
    }, 1_000);
    return () => clearInterval(timer);
  }, [error, total]);

  return countdown.error === error ? countdown.remaining : total;
}
