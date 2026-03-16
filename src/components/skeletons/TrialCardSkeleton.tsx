import React from "react";
import { Skeleton } from "../ui/skeleton";

export interface TrialCardSkeletonProps {
  count?: number;
}

export function TrialCardSkeleton({ count = 1 }: TrialCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-white p-6">
          <div className="space-y-4">
            {/* Title and status */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <Skeleton className="h-7 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
