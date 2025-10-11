import { useMemo, useState } from "react";
import type { SearchFilters } from "../types";
import { useDebounce } from "use-debounce";

export function useMovieFilters() {

  const INITIAL_FILTERS: SearchFilters = {
    query: '',
    genre: undefined,
    year: undefined,
    rating: undefined,
    available: undefined,
  };

  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<'title' | 'rating' | 'year'>('title');

  const availability = useMemo<'all' | 'available' | 'upcoming'>(() => {
    if (filters.available === undefined) {
      return 'all';
    }
    return filters.available ? 'available' : 'upcoming';
  }, [filters.available]);

  const handleFiltersChange = (nextFilters: SearchFilters) => {
    setFilters({
      ...nextFilters,
      query: nextFilters.query ?? '',
    });
  };

  const handleAvailabilityChange = (value: 'all' | 'available' | 'upcoming') => {
    handleFiltersChange({
      ...filters,
      available: value === 'all' ? undefined : value === 'available',
    });
  };

  const handleClearFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
  };

  const [debouncedQuery] = useDebounce(filters.query, 500);


  return { filters, setFilters, sortBy, setSortBy, availability, debouncedQuery, handlers: { handleFiltersChange, handleAvailabilityChange, handleClearFilters } }
}
