import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAutocompleteSuggestions, type AutocompleteSuggestion } from '../lib/searchEngine';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  inputClassName?: string;
  debounceMs?: number;
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  oncology: 'Cancer',
  cardiology: 'Heart',
  neurology: 'Brain/Nerves',
  pulmonology: 'Lungs',
  metabolic: 'Metabolism',
  autoimmune: 'Autoimmune',
  infectious: 'Infectious',
  musculoskeletal: 'Bone/Muscle',
  psychiatric: 'Mental Health',
  other: 'Other'
};

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  oncology: 'bg-red-100 text-red-700',
  cardiology: 'bg-pink-100 text-pink-700',
  neurology: 'bg-purple-100 text-purple-700',
  pulmonology: 'bg-blue-100 text-blue-700',
  metabolic: 'bg-amber-100 text-amber-700',
  autoimmune: 'bg-orange-100 text-orange-700',
  infectious: 'bg-green-100 text-green-700',
  musculoskeletal: 'bg-teal-100 text-teal-700',
  psychiatric: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700'
};

export function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search conditions...',
  label,
  className = '',
  inputClassName = '',
  debounceMs = 150
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const searchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(() => {
      const results = getAutocompleteSuggestions(query, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1);
      setIsLoading(false);
    }, debounceMs);
  }, [debounceMs]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchSuggestions(newValue);
  }, [onChange, searchSuggestions]);

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    onChange(suggestion.text);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect?.(suggestion);
    inputRef.current?.focus();
  }, [onChange, onSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && value.length >= 2) {
        searchSuggestions(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  }, [isOpen, suggestions, highlightedIndex, handleSelect, searchSuggestions, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs text-gray-600 mb-1">{label}</label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && searchSuggestions(value)}
          placeholder={placeholder}
          className={`w-full border border-gray-300 px-4 py-3 placeholder:text-gray-400/80 focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClassName}`}
          style={{ borderRadius: '0.5rem' }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.text}-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`
                px-4 py-3 cursor-pointer flex items-center justify-between gap-2
                transition-colors duration-75
                ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}
              `}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {highlightMatch(suggestion.text, value)}
                </div>
                {suggestion.type === 'synonym' && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Related term
                  </div>
                )}
              </div>

              <span
                className={`
                  text-xs font-medium px-2 py-0.5 rounded-full shrink-0
                  ${CATEGORY_COLORS[suggestion.category] || CATEGORY_COLORS.other}
                `}
              >
                {CATEGORY_LABELS[suggestion.category] || suggestion.category}
              </span>
            </li>
          ))}

          {/* Search tip */}
          <li className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Enter</kbd> to select
            or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Esc</kbd> to close
          </li>
        </ul>
      )}
    </div>
  );
}

/**
 * Highlight matching text in suggestion
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span className="font-bold text-blue-600">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

export default SearchAutocomplete;
