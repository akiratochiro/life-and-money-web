import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** O anel do donut (200 px, traço de 26 px) e a legenda ao lado, como no ExpensesDonut. */
export function DonutSkeleton() {
  return (
    <SkeletonGroup label="Carregando gastos" className="flex flex-col items-center gap-6 sm:flex-row">
      <span
        aria-hidden="true"
        className="block h-[200px] w-[200px] shrink-0 rounded-full border-[26px] border-sunken motion-safe:animate-pulse"
      />
      <div className="flex w-full flex-col gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Bone className="h-3 w-3 rounded-full" />
            <Bone className="h-4 flex-1 rounded-full" />
            <Bone className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** Seis meses de barras com alturas variadas, na mesma altura do MonthlyBars (h-48). */
const HEIGHTS = [[70, 55, 20], [80, 60, 25], [65, 70, 15], [90, 50, 30], [75, 65, 20], [40, 35, 10]];

export function BarsSkeleton() {
  return (
    <SkeletonGroup label="Carregando histórico" className="flex flex-col gap-3">
      <div className="flex h-48 items-end gap-1.5">
        {HEIGHTS.map((bars, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center gap-0.5 px-1">
            {bars.map((height, j) => (
              <span
                key={j}
                aria-hidden="true"
                className="block w-full max-w-3 rounded-t-md bg-sunken motion-safe:animate-pulse"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {HEIGHTS.map((_, i) => (
          <Bone key={i} className="mx-auto h-3 w-6 rounded-full" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
