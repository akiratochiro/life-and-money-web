import { Bone, SkeletonGroup } from "../../shared/ui/Skeleton";

/** O calendário (sete colunas, cinco semanas), os totais do mês e dois vencimentos. */
export function BillsSkeleton() {
  return (
    <SkeletonGroup className="flex flex-col gap-6">
      <div className="rounded-card bg-surface p-3 shadow-card">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} className="mx-auto h-3 w-3 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <Bone key={i} className="aspect-square min-h-11 rounded-2xl" />
          ))}
        </div>
        <Bone className="mx-auto mt-3 h-3 w-2/3 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-card bg-surface p-4">
            <Bone className="h-3 w-20 rounded-full" />
            <Bone className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <OccurrenceSkeleton key={i} />
        ))}
      </div>
    </SkeletonGroup>
  );
}

function OccurrenceSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Bone className="mt-1.5 h-3 w-3 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex justify-between gap-2">
            <Bone className="h-4 w-1/3 rounded-full" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-3 w-1/2 rounded-full" />
          <Bone className="h-3 w-1/3 rounded-full" />
        </div>
      </div>
      <Bone className="h-11 w-40 rounded-full" />
    </div>
  );
}
