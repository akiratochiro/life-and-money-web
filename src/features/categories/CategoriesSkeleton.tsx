import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** Uma seção por tipo, com o título e as linhas das categorias. */
export function CategoriesSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      {[4, 2, 1].map((rows, i) => (
        <section key={i} className="flex flex-col gap-2">
          <Bone on="page" className="mx-1 h-5 w-28 rounded-full" />
          <div className="flex flex-col rounded-card bg-surface p-2">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex items-center gap-2 px-3 py-1.5">
                <Bone className="h-4 flex-1 rounded-full" />
                <Bone className="h-11 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SkeletonGroup>
  );
}
