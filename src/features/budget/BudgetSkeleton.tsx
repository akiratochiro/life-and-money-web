import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** O resumo do mês (três números) e duas linhas de orçamento com barra. */
export function BudgetSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-3">
      <section className="flex flex-col gap-4 rounded-hero bg-surface p-6 shadow-card">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-16 rounded-full" />
              <Bone className="h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>
      {[0, 1].map((i) => (
        <article key={i} className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
          <div className="flex justify-between gap-2">
            <Bone className="h-4 w-1/3 rounded-full" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-2.5 w-full rounded-full" />
          <div className="flex justify-between gap-3">
            <Bone className="h-4 w-1/2 rounded-full" />
            <Bone className="h-3 w-12 rounded-full" />
          </div>
        </article>
      ))}
    </SkeletonGroup>
  );
}
