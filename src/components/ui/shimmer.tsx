/**
 * Lightweight shimmer placeholder for content that's loading from the DB.
 * Shows a brief gradient animation, then fades out when children render.
 */
export function Shimmer({ className = "", height = "h-6" }: { className?: string; height?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer ${height} ${className}`} />
  );
}

export function ShimmerBlock({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} height="h-4" className={i === lines - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function ShimmerCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 space-y-3 ${className}`}>
      <Shimmer height="h-3" className="w-1/3" />
      <Shimmer height="h-8" className="w-1/4" />
      <Shimmer height="h-3" className="w-1/2" />
    </div>
  );
}
