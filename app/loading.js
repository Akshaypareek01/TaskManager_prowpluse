import Skeleton, { SkeletonStat, SkeletonTaskCard } from "./components/ui/Skeleton";

/**
 * Route-level loading state. The page is server-rendered from the database, so
 * this is what people see while that query runs. It mirrors the real layout's
 * box sizes exactly, so nothing jumps when the data lands.
 */
export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading the wall">
      {/* Header */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-shell items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <Skeleton className="ml-auto h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="mx-auto max-w-shell px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-72" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonStat key={i} />
          ))}
        </div>

        <div className="panel mb-5">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3.5 sm:px-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-full" />
            ))}
          </div>
        </div>

        <Skeleton className="mb-4 h-11 w-64 rounded-xl" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonTaskCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
