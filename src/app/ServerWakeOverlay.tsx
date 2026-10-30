import { Button } from "../shared/ui/Button";

type Props = {
  status: "waking" | "unreachable";
  onRetry: () => void;
};

/**
 * Cobre o app enquanto a API do plano gratuito acorda, para a espera não parecer erro. Só aparece
 * depois de uns 2 segundos sem resposta: quando a API já está acordada, ninguém chega a vê-lo.
 */
export function ServerWakeOverlay({ status, onRetry }: Props) {
  const waking = status === "waking";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900 px-5 motion-safe:animate-fade-in">
      <div role="status" aria-live="polite" className="flex w-full max-w-sm flex-col items-center text-center">
        <WakeMark spinning={waking} />

        <p className="mt-8 font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>

        {waking ? (
          <>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight">Acordando o servidor…</p>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">
              O servidor gratuito dorme quando ninguém usa o app. A primeira visita depois disso
              leva até um minuto.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight">
              O servidor não respondeu
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">
              Ele não acordou depois de um minuto e meio. Confira sua conexão e tente de novo.
            </p>
            <Button type="button" onClick={onRetry} className="mt-8 w-full">
              Tentar de novo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Um trilho com um arco no acento do app, girando devagar enquanto o servidor acorda. */
function WakeMark({ spinning }: { spinning: boolean }) {
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      data-testid="wake-mark"
      // Sem movimento para quem pediu menos animação: o texto já diz o que está acontecendo.
      className={spinning ? "motion-safe:animate-[spin_1.6s_linear_infinite]" : undefined}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-signal)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.28} ${circumference}`}
      />
    </svg>
  );
}
