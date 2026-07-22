import React, { useMemo, useState } from 'react';
import MapLibreOpportunityMap from './OpportunityMapMapLibre';
import SearchToolbar from './SearchToolbar';
import FilterToolbar from './FilterToolbar';

export default function MapWorkspace({ items, categoryOf, navigate }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter(item => {
      const matchesCategory = category === 'all' || categoryOf(item) === category;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        item.title,
        item.organization,
        item.city,
        item.county,
        item.notes,
        item.specialty,
        item.opportunity_type,
        item.opportunity_category
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [items, category, categoryOf, query]);

  function explore() {
    navigate(category === 'all' || category === 'clinic' ? 'clinical' : category);
  }

  function submitSearch(event) {
    event.preventDefault();
    explore();
  }

  return (
    <section className="map-workspace" aria-label="Explore Georgia healthcare opportunities">
      <SearchToolbar query={query} onQueryChange={setQuery} onSubmit={submitSearch} />
      <FilterToolbar category={category} onCategoryChange={setCategory} resultCount={filtered.length} />
      <MapLibreOpportunityMap items={filtered.slice(0, 120)} premium />
    </section>
  );
}
