import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** Dois cards de meta: anel, nome, valores e a faixa de "guarde por mês". */
export function GoalsSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <article key={i} className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-4">
            <Bone className="h-[68px] w-[68px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-4 w-1/2 rounded-full" />
              <Bone className="h-3 w-2/3 rounded-full" />
              <Bone className="h-3 w-1/3 rounded-full" />
            </div>
          </div>
          <Bone className="h-12 w-full rounded-2xl" />
          <Bone className="h-11 w-28 rounded-full" />
        </article>
      ))}
    </SkeletonGroup>
  );
}
