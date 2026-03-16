import React from "react";
import { Skeleton } from "../ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="grid lg:grid-cols-4 gap-4">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Mini calendar */}
        <div className="rounded-xl border bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-3">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
        </div>

        {/* Details panel */}
        <div className="rounded-xl border bg-white p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-40 mt-2" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-16 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Main calendar area */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-8 border rounded-lg overflow-hidden">
          {/* Header row */}
          <Skeleton className="h-10 rounded-none" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-none border-l" />
          ))}

          {/* Time slots (10 rows) */}
          {Array.from({ length: 10 }).map((_, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <Skeleton className="h-20 rounded-none border-t" />
              {Array.from({ length: 7 }).map((_, colIndex) => (
                <Skeleton
                  key={`${rowIndex}-${colIndex}`}
                  className="h-20 rounded-none border-l border-t"
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
