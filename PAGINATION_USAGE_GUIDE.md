# Pagination Usage Guide

## Quick Start

### 1. Using the Pagination Component Directly

```typescript
import { Pagination } from "@/components/ui/pagination";

function MyComponent() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  );
}
```

### 2. Using the usePagination Hook (Recommended)

```typescript
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/ui/pagination";

function MyComponent() {
  const [items, setItems] = useState<Item[]>([...]);
  
  const {
    currentPage,
    totalPages,
    pageItems,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrevious
  } = usePagination({
    items,
    pageSize: 10,
    initialPage: 1  // optional
  });
  
  return (
    <>
      {pageItems.map(item => <ItemCard key={item.id} {...item} />)}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </>
  );
}
```

## Common Patterns

### Pattern 1: Simple Client-Side Pagination

```typescript
const MyTable = ({ data }: { data: Item[] }) => {
  const { pageItems, ...pagination } = usePagination({
    items: data,
    pageSize: 20
  });
  
  return (
    <div>
      <table>
        <tbody>
          {pageItems.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination {...pagination} />
    </div>
  );
};
```

### Pattern 2: Pagination with Filtering

```typescript
const FilterableList = ({ data }: { data: Item[] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = useMemo(() => {
    return data.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);
  
  const pagination = usePagination({
    items: filteredItems,
    pageSize: 15
  });
  
  return (
    <>
      <input 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />
      
      {pagination.pageItems.map(item => (
        <Card key={item.id}>{item.name}</Card>
      ))}
      
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.goToPage}
      />
    </>
  );
};
```

### Pattern 3: URL-Based Pagination (for bookmarkable pages)

```typescript
import { useNavigate, useLocation } from "react-router-dom";

const BookmarkablePagination = ({ items }: { items: Item[] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const page = Number(params.get("page"));
    return page > 0 ? page : 1;
  }, [location.search]);
  
  const totalPages = Math.ceil(items.length / 25);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * 25;
    return items.slice(start, start + 25);
  }, [items, currentPage]);
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(location.search);
    params.set("page", String(page));
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  
  return (
    <>
      {pageItems.map(item => <Item key={item.id} {...item} />)}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  );
};
```

### Pattern 4: Manual Navigation Controls

```typescript
const ManualPagination = ({ items }: { items: Item[] }) => {
  const pagination = usePagination({ items, pageSize: 10 });
  
  return (
    <>
      <div className="flex justify-between items-center">
        <button 
          onClick={pagination.prevPage}
          disabled={!pagination.canGoPrevious}
        >
          Previous
        </button>
        
        <span>
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        
        <button 
          onClick={pagination.nextPage}
          disabled={!pagination.canGoNext}
        >
          Next
        </button>
      </div>
      
      {pagination.pageItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </>
  );
};
```

## Customization

### Custom Styling

```typescript
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  className="my-custom-class"
  showPageNumbers={true}
  maxPageButtons={7}  // Show more page numbers
/>
```

### Hide Page Numbers (Mobile-First)

```typescript
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  showPageNumbers={false}  // Only show prev/next
/>
```

## API Reference

### Pagination Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | required | Current active page (1-indexed) |
| `totalPages` | `number` | required | Total number of pages |
| `onPageChange` | `(page: number) => void` | required | Callback when page changes |
| `className` | `string` | `undefined` | Additional CSS classes |
| `showPageNumbers` | `boolean` | `true` | Show/hide page number buttons |
| `maxPageButtons` | `number` | `5` | Max page numbers to display |

### usePagination Hook

**Input:**
```typescript
interface UsePaginationOptions<T> {
  items: T[];
  pageSize: number;
  initialPage?: number;
}
```

**Output:**
```typescript
interface UsePaginationResult<T> {
  currentPage: number;        // Current page number
  totalPages: number;         // Total number of pages
  pageItems: T[];             // Items for current page
  goToPage: (page: number) => void;  // Jump to specific page
  nextPage: () => void;       // Go to next page
  prevPage: () => void;       // Go to previous page
  canGoNext: boolean;         // Can navigate forward
  canGoPrevious: boolean;     // Can navigate backward
  startIndex: number;         // Index of first item on page
  endIndex: number;           // Index of last item on page
}
```

## Best Practices

1. **Always memoize filtered items** to prevent unnecessary recalculations
2. **Use initialPage** when restoring pagination state (e.g., from URL)
3. **Reset to page 1** when filters change
4. **Show total count** alongside pagination for better UX
5. **Consider virtual scrolling** for very large datasets (1000+ items)
6. **Use URL params** for bookmarkable pagination in main content areas
7. **Use local state** for modals and secondary lists

## Troubleshooting

### Pagination not updating after filter change
```typescript
// ❌ Wrong - pagination state not reset
const [query, setQuery] = useState("");
const filtered = items.filter(i => i.name.includes(query));
const pagination = usePagination({ items: filtered, pageSize: 10 });

// ✅ Correct - reset pagination when filter changes
useEffect(() => {
  pagination.goToPage(1);
}, [query]);
```

### Empty page after deleting items
```typescript
// ✅ Check if current page is now empty and go back
useEffect(() => {
  if (pageItems.length === 0 && currentPage > 1) {
    goToPage(currentPage - 1);
  }
}, [pageItems.length, currentPage]);
```

### Performance issues with large arrays
```typescript
// ✅ Memoize expensive computations
const filteredAndSorted = useMemo(() => {
  return items
    .filter(item => item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

const pagination = usePagination({ 
  items: filteredAndSorted, 
  pageSize: 20 
});
```
