import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import MapLibreOpportunityMap from './OpportunityMapMapLibre';

const CATEGORIES = [
  ['all', 'All opportunities'],
  ['clinic', 'Clinical'],
  ['rural', 'Rural Health'],
  ['shadowing', 'Shadowing'],
  ['research', 'Research']
];

export default function MapWorkspace({ items, categoryOf, navigate }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesCategory = category === 'all' || categoryOf(item) === category;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = `${item.title || ''} ${item.organization || ''} ${item.city || ''} ${item.county || ''} ${item.notes || ''}`.toLowerCase();
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
      <form className="map-workspace-search" onSubmit={submitSearch}>
        <div className="discovery-field">
          <Search size={20} />
          <div>
            <small>What are you looking for?</small>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Hospital, clinic, city, specialty..."
              aria-label="Search healthcare opportunities"
            />
          </div>
        </div>
        <button className="discovery-submit" type="submit">
          Search <ArrowRight size={17} />
        </button>
      </form>

      <div className="map-workspace-filters" aria-label="Opportunity categories">
        {CATEGORIES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={category === key ? 'active' : ''}
            onClick={() => setCategory(key)}
            aria-pressed={category === key}
          >
            {label}
          </button>
        ))}
        <span className="map-workspace-summary">{filtered.length} results</span>
      </div>

      <MapLibreOpportunityMap items={filtered.slice(0, 120)} premium />
    </section>
  );
}
