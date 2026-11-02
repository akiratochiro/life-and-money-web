import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** Dois dias com três lançamentos cada, no mesmo desenho das linhas do extrato. */
export function TransactionListSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-5">
      {[0, 1].map((group) => (
        <section key={group} className="flex flex-col gap-1">
          <Bone on="page" className="mx-3 mb-1 h-3 w-24 rounded-full" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 px-3 py-3">
              <Bone on="page" className="h-10 w-10 shrink-0 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Bone on="page" className="h-4 w-1/3 rounded-full" />
                <Bone on="page" className="h-3 w-1/2 rounded-full" />
              </div>
              <Bone on="page" className="h-4 w-20 rounded-full" />
            </div>
          ))}
        </section>
      ))}
    </SkeletonGroup>
  );
}
