import React from 'react';

export const OPPORTUNITY_CATEGORIES = [
  ['all', 'All opportunities'],
  ['clinic', 'Clinical'],
  ['rural', 'Rural Health'],
  ['shadowing', 'Shadowing'],
  ['research', 'Research']
];

export default function FilterToolbar({ category, onCategoryChange, resultCount }) {
  return (
    <div className="map-workspace-filters filter-toolbar" aria-label="Opportunity categories">
      <div className="filter-toolbar-options" role="group" aria-label="Filter opportunities by category">
        {OPPORTUNITY_CATEGORIES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={category === key ? 'active' : ''}
            onClick={() => onCategoryChange(key)}
            aria-pressed={category === key}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="map-workspace-summary" aria-live="polite">{resultCount} results</span>
    </div>
  );
}
