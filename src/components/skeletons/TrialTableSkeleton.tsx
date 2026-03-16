import React from "react";
import { Skeleton } from "../ui/skeleton";

export interface TrialTableSkeletonProps {
  rows?: number;
}

export function TrialTableSkeleton({ rows = 4 }: TrialTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50/80 backdrop-blur text-left text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">Trial Title</th>
            <th className="px-4 py-3 font-medium">Trial ID</th>
            <th className="px-4 py-3 font-medium">Trial Status</th>
            <th className="px-4 py-3 font-medium">Compatibility Score</th>
            <th className="px-4 py-3 font-medium">Interventions</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3 align-top">
                <Skeleton className="h-5 w-full mb-2" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-4 py-3 align-top">
                <Skeleton className="h-6 w-24 rounded-full" />
              </td>
              <td className="px-4 py-3 align-top min-w-[180px]">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mt-1" />
              </td>
              <td className="px-4 py-3 align-top max-w-[220px]">
                <Skeleton className="h-4 w-full" />
              </td>
              <td className="px-4 py-3 text-right align-top">
                <Skeleton className="h-7 w-44 rounded-lg ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
