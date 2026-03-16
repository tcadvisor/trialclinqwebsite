# Skeleton Loaders Implementation

This document describes the skeleton loader implementation for the TrialCliniq application.

## Overview

Skeleton loaders have been implemented across the application to provide better loading states and improve perceived performance. They replace plain "Loading..." text with animated placeholders that match the structure of the actual content.

## Created Files

### Base Components
- `/src/components/ui/skeleton.tsx` - Base skeleton components with Tailwind's animate-pulse

### Specific Skeletons
- `/src/components/skeletons/TrialCardSkeleton.tsx` - For trial cards in search results
- `/src/components/skeletons/TrialTableSkeleton.tsx` - For trial tables in dashboard/eligible trials
- `/src/components/skeletons/StudyDetailsSkeleton.tsx` - For study detail pages
- `/src/components/skeletons/CalendarSkeleton.tsx` - For calendar views
- `/src/components/skeletons/index.tsx` - Central export file
- `/src/components/skeletons/README.md` - Usage documentation

## Implementation Locations

### 1. Dashboard (src/screens/patients/Dashboard.tsx)
**Lines: 211-215**
```tsx
{isLoadingMatches ? (
  <div className="mt-4">
    <TrialTableSkeleton rows={4} />
  </div>
) : (
  // ... actual table content
)}
```
- Shows 4 skeleton rows while loading trial matches
- Replaces the previous "Refreshing matches..." text message

### 2. Eligible Trials (src/screens/patients/EligibleTrials.tsx)
**Lines: 189-191**
```tsx
{isLoading ? (
  <TrialTableSkeleton rows={25} />
) : (
  // ... actual table content
)}
```
- Shows 25 skeleton rows (matching page size) while loading
- Replaces the previous "Refreshing matches..." message

### 3. Search Results (src/screens/SearchResults.tsx)
**Lines: 577-581**
```tsx
{loading && (
  <TrialCardSkeleton count={pageSize} />
)}
```
- Shows skeleton cards matching the number of results per page
- Replaces spinner + "Loading trials..." text

### 4. Study Details (src/screens/CtgovStudyDetails.tsx)
**Lines: 229-231**
```tsx
{loading && (
  <StudyDetailsSkeleton />
)}
```
- Shows complete study details skeleton structure
- Replaces spinner + "Loading study..." text

### 5. Appointments (src/screens/providers/Appointments.tsx)
**Status: Available but not implemented**
- CalendarSkeleton component created
- Not implemented because page uses static data
- Can be integrated when async data loading is added

## Features

### Animation
All skeletons use Tailwind's `animate-pulse` utility for a subtle shimmer effect:
```tsx
className="animate-pulse bg-gray-200 rounded"
```

### Configurability
Components accept props for customization:
- `TrialCardSkeleton`: `count` prop for number of cards
- `TrialTableSkeleton`: `rows` prop for number of table rows
- All support className overrides

### Accessibility
Skeletons maintain the same DOM structure as actual content, ensuring:
- Screen readers can understand the layout
- Layout shift is minimized when content loads
- Visual hierarchy is preserved

## Usage Examples

### Basic Skeleton
```tsx
import { Skeleton } from "../components/ui/skeleton";

<Skeleton className="h-4 w-full" />
```

### Text Lines
```tsx
import { SkeletonText } from "../components/ui/skeleton";

<SkeletonText lines={3} />
```

### Trial Cards
```tsx
import { TrialCardSkeleton } from "../components/skeletons";

{loading && <TrialCardSkeleton count={12} />}
```

### Trial Table
```tsx
import { TrialTableSkeleton } from "../components/skeletons";

{isLoading ? (
  <TrialTableSkeleton rows={25} />
) : (
  <ActualTable />
)}
```

## Design Principles

1. **Match Structure**: Skeletons mirror the actual content layout
2. **Appropriate Size**: Number of skeleton items matches expected results
3. **Consistent Animation**: All use `animate-pulse` for uniformity
4. **Progressive Loading**: Show skeletons immediately, no delay

## Future Enhancements

- Add fade-in transition when content replaces skeleton
- Create additional specialized skeletons as needed
- Consider staggered animation for improved visual appeal
- Add skeleton variants for different content densities

## Testing

To see the skeletons in action:
1. Open the application
2. Navigate to any of the implemented pages
3. Observe the loading state before data arrives
4. Note: You may need to throttle network speed to see them clearly

## Files Modified

- `/src/screens/patients/Dashboard.tsx`
- `/src/screens/patients/EligibleTrials.tsx`
- `/src/screens/SearchResults.tsx`
- `/src/screens/CtgovStudyDetails.tsx`

## Notes

- The build error in `useToast.ts` is unrelated to skeleton implementation
- All skeleton components are properly typed with TypeScript
- Components follow existing code style and conventions
- No breaking changes to existing functionality
