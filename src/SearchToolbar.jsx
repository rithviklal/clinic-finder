import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Search, X } from 'lucide-react';

export default function SearchToolbar({
  query,
  onQueryChange,
  onSubmit,
  suggestions = [],
  onSuggestionSelect,
  activeFilters = [],
  onRemoveFilter
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef(null);

  useEffect(() => {
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function choose(suggestion) {
    onSuggestionSelect?.(suggestion);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(event) {
    if (!open || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted(value => (value + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted(value => (value <= 0 ? suggestions.length - 1 : value - 1));
    } else if (event.key === 'Enter' && highlighted >= 0) {
      event.preventDefault();
      choose(suggestions[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div className="intelligent-search" ref={rootRef}>
      <form className="map-workspace-search search-toolbar" onSubmit={onSubmit}>
        <div className="discovery-field">
          <Search size={20} aria-hidden="true" />
          <div>
            <small>What are you looking for?</small>
            <input
              value={query}
              onChange={event => {
                onQueryChange(event.target.value);
                setOpen(true);
                setHighlighted(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Try “pediatric shadowing near Atlanta”"
              aria-label="Search healthcare opportunities"
              aria-autocomplete="list"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="openvol-search-suggestions"
            />
          </div>
        </div>
        <button className="discovery-submit" type="submit">
          Search <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className="search-suggestions" id="openvol-search-suggestions" role="listbox">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.label}`}
              type="button"
              role="option"
              aria-selected={highlighted === index}
              className={highlighted === index ? 'highlighted' : ''}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(suggestion)}
            >
              <span className="suggestion-icon">{suggestion.type === 'City' || suggestion.type === 'County' ? <MapPin size={15} /> : <Search size={15} />}</span>
              <span><b>{suggestion.label}</b><small>{suggestion.type}</small></span>
            </button>
          ))}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="active-search-filters" aria-label="Active search filters">
          {activeFilters.map(filter => (
            <button key={filter.key} type="button" onClick={() => onRemoveFilter?.(filter.key)} aria-label={`Remove ${filter.label} filter`}>
              <span>{filter.label}</span><X size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
