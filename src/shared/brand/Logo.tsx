import { PigFace } from "./illustrations";

/**
 * O logo: o rosto do porco num ladrilho de argila e o nome em Fredoka. O "Money" usa o rosa
 * escuro da marca; em negrito e nesse tamanho, ele conta como texto grande (WCAG pede 3:1).
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pig-100 shadow-clay-sm">
        <PigFace width={28} height={28} />
      </span>
      <span className="font-display text-xl font-bold leading-none text-text">
        Life and <span className="text-pig-600">Money</span>
      </span>
    </span>
  );
}
