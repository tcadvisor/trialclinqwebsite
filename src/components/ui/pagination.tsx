import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  maxPageButtons?: number;
}

/**
 * Reusable Pagination component
 *
 * Features:
 * - Shows page numbers with ellipsis for many pages
 * - Has Previous/Next buttons
 * - Shows current page and total pages
 * - Accessible with proper aria labels
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageNumbers = true,
  maxPageButtons = 5,
}) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  // Calculate which page numbers to show
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];
    const halfMax = Math.floor(maxPageButtons / 2);

    // Always show first page
    pages.push(1);

    let startPage = Math.max(2, currentPage - halfMax);
    let endPage = Math.min(totalPages - 1, currentPage + halfMax);

    // Adjust if we're near the start or end
    if (currentPage <= halfMax + 1) {
      endPage = Math.min(totalPages - 1, maxPageButtons - 1);
    } else if (currentPage >= totalPages - halfMax) {
      startPage = Math.max(2, totalPages - maxPageButtons + 2);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("ellipsis");
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push("ellipsis");
    }

    // Always show last page if there are multiple pages
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn("flex items-center justify-between gap-2 flex-wrap", className)}
      role="navigation"
      aria-label="Pagination navigation"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {showPageNumbers && (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === "ellipsis") {
                return (
                  <div
                    key={`ellipsis-${index}`}
                    className="px-2 py-1 text-gray-500"
                    aria-hidden="true"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                );
              }

              const isActive = page === currentPage;

              return (
                <Button
                  key={page}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  disabled={isActive}
                  aria-label={`Go to page ${page}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "min-w-[2rem]",
                    isActive && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {page}
                </Button>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-sm text-gray-600" aria-live="polite">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};
