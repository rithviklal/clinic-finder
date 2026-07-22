import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LEGEND_ITEMS = [
  ['clinical-dot', 'Clinical'],
  ['rural-dot', 'Rural Health'],
  ['shadow-dot', 'Shadowing'],
  ['research-dot', 'Research']
];

export default function MapFooter({ mappedCount, visibleCount, areaFiltered }) {
  const [legendOpen, setLegendOpen] = useState(true);

  return (
    <div className="map-footer">
      <div className={`map-legend ${legendOpen ? 'open' : 'collapsed'}`}>
        <button
          type="button"
          className="map-legend-toggle"
          onClick={() => setLegendOpen(open => !open)}
          aria-expanded={legendOpen}
        >
          <span>Legend</span>
          {legendOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>

        {legendOpen && (
          <div className="map-legend-items">
            {LEGEND_ITEMS.map(([dotClass, label]) => (
              <span key={label}>
                <i className={`legend-dot ${dotClass}`} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="map-result-count" aria-live="polite">
        <b>{mappedCount}</b>
        <span>{areaFiltered ? 'in searched area' : 'mapped opportunities'}</span>
        <small>{visibleCount} visible now</small>
      </div>
    </div>
  );
}
