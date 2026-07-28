/**
 * Shimmer placeholders. Skeletons mirror the real layout's box sizes so the
 * page doesn't shift when data arrives.
 */

/**
 * @param {{ className?: string }} props
 */
export default function Skeleton({ className = "" }) {
  return <span className={`skeleton block ${className}`} />;
}

/**
 * Text lines with a shortened last line.
 * @param {{ lines?: number, className?: string }} props
 */
export function SkeletonText({ lines = 2, className = "" }) {
  return (
    <span className={`block space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </span>
  );
}

/** Matches the footprint of a TaskCard. */
export function SkeletonTaskCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="mt-2.5 h-3 w-1/3" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/** Matches the footprint of a StatCard. */
export function SkeletonStat() {
  return (
    <div className="card p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
    </div>
  );
}
