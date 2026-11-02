import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** Mesma estrutura da Início: saldo, atalho, metas e orçamento. */
export function HomeSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-hero bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <Bone className="h-4 w-32 rounded-full" />
          <Bone className="h-11 w-11 rounded-full" />
        </div>
        <Bone className="h-10 w-48 rounded-xl" />
        <Bone className="h-2.5 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-14 rounded-full" />
              <Bone className="h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <Bone className="h-16 w-full rounded-2xl" />
      </section>
      <Bone on="page" className="-mt-3 mx-auto h-4 w-52 rounded-full" />
      <SectionSkeleton>
        <article className="flex items-center gap-4 rounded-card bg-surface p-5 shadow-card">
          <Bone className="h-[68px] w-[68px] shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-4 w-1/2 rounded-full" />
            <Bone className="h-3 w-2/3 rounded-full" />
          </div>
        </article>
      </SectionSkeleton>
      <SectionSkeleton>
        <div className="flex flex-col gap-5 rounded-card bg-surface p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Bone className="h-4 w-24 rounded-full" />
                <Bone className="h-4 w-20 rounded-full" />
              </div>
              <Bone className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </SectionSkeleton>
    </SkeletonGroup>
  );
}

function SectionSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex h-11 items-center justify-between">
        <Bone on="page" className="h-4 w-28 rounded-full" />
        <Bone on="page" className="h-4 w-14 rounded-full" />
      </div>
      {children}
    </section>
  );
}
