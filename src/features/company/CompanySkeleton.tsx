import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** O cabeçalho (emoji, nome, enquadramento) e os dois cards da visão geral. */
export function CompanySkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Bone className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Bone className="h-6 w-1/2 rounded-full" />
          <Bone className="h-3 w-1/3 rounded-full" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
          <Bone className="h-4 w-1/3 rounded-full" />
          <Bone className="h-3 w-2/3 rounded-full" />
          <Bone className="h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
