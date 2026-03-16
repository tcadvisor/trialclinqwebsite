import { useState, useMemo, useCallback } from "react";

export interface UsePaginationOptions<T> {
  items: T[];
  pageSize: number;
  initialPage?: number;
}

export interface UsePaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageItems: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * Custom hook for pagination
 *
 * Features:
 * - Manages currentPage state
 * - Calculates totalPages from items.length and pageSize
 * - Returns paginated items slice
 * - Provides goToPage, nextPage, prevPage functions
 *
 * @example
 * const { currentPage, totalPages, pageItems, goToPage } = usePagination({
 *   items: myArray,
 *   pageSize: 10
 * });
 */
export function usePagination<T>({
  items,
  pageSize,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / pageSize));
  }, [items.length, pageSize]);

  // Calculate start and end indices for current page
  const startIndex = useMemo(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  const endIndex = useMemo(() => {
    return Math.min(startIndex + pageSize, items.length);
  }, [startIndex, pageSize, items.length]);

  // Get items for current page
  const pageItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const canGoNext = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const canGoPrevious = useMemo(() => currentPage > 1, [currentPage]);

  return {
    currentPage,
    totalPages,
    pageItems,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
  };
}
