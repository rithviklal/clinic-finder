import React from 'react';
import { ArrowRight, Search } from 'lucide-react';

export default function SearchToolbar({ query, onQueryChange, onSubmit }) {
  return (
    <form className="map-workspace-search search-toolbar" onSubmit={onSubmit}>
      <div className="discovery-field">
        <Search size={20} aria-hidden="true" />
        <div>
          <small>What are you looking for?</small>
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Hospital, clinic, city, specialty..."
            aria-label="Search healthcare opportunities"
          />
        </div>
      </div>
      <button className="discovery-submit" type="submit">
        Search <ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
