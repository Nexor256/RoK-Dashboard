import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-0 rounded-lg border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1 rounded-md" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0"
          style={{ animationDelay: `${rowIdx * 80}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`r${rowIdx}-c${colIdx}`}
              className="h-4 flex-1 rounded-md"
              style={{
                width: colIdx === 0 ? "40%" : colIdx === 1 ? "60%" : "100%",
                animationDelay: `${(rowIdx * columns + colIdx) * 30}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
