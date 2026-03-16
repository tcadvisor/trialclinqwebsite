import React from "react";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";
import { Separator } from "../ui/separator";

export function StudyDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="text-center">
            <Skeleton className="h-[84px] w-[84px] rounded-full" />
            <Skeleton className="h-3 w-20 mt-1 mx-auto" />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 mt-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Conditions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>

      {/* Overview card */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Separator />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </CardContent>
      </Card>

      {/* Eligibility card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusion */}
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {/* Exclusion */}
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-56 rounded-full" />
      </div>
    </div>
  );
}
