# Skeleton Loaders

This directory contains skeleton loader components used throughout the application to provide loading states.

## Available Components

### Base Components (in `ui/skeleton.tsx`)

- **Skeleton** - Base animated placeholder
- **SkeletonText** - Text line placeholders
- **SkeletonCard** - Generic card placeholder
- **SkeletonTable** - Generic table placeholder

### Specific Components

- **TrialCardSkeleton** - For trial cards in search results
- **TrialTableSkeleton** - For trial table rows in dashboard/eligible trials
- **StudyDetailsSkeleton** - For study detail pages
- **CalendarSkeleton** - For calendar/appointment views

## Usage Examples

### TrialTableSkeleton
```tsx
import { TrialTableSkeleton } from "../../components/skeletons";

{isLoading ? (
  <TrialTableSkeleton rows={4} />
) : (
  <div>...actual content...</div>
)}
```

### TrialCardSkeleton
```tsx
import { TrialCardSkeleton } from "../components/skeletons";

{loading && (
  <TrialCardSkeleton count={12} />
)}
```

### StudyDetailsSkeleton
```tsx
import { StudyDetailsSkeleton } from "../components/skeletons";

{loading && (
  <StudyDetailsSkeleton />
)}
```

### CalendarSkeleton
```tsx
import { CalendarSkeleton } from "../../components/skeletons";

{isLoadingCalendar ? (
  <CalendarSkeleton />
) : (
  <div>...calendar grid...</div>
)}
```

## Implementation Status

- ✅ Dashboard.tsx - Uses TrialTableSkeleton
- ✅ EligibleTrials.tsx - Uses TrialTableSkeleton
- ✅ SearchResults.tsx - Uses TrialCardSkeleton
- ✅ CtgovStudyDetails.tsx - Uses StudyDetailsSkeleton
- ⏸️ Appointments.tsx - CalendarSkeleton available (page uses static data, no loading state needed currently)

## Animation

All skeleton components use Tailwind's `animate-pulse` utility for the shimmer effect.
