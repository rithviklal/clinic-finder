import React from 'react';
import { BookmarkPlus, MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';

const SPECIALTIES = ['Family Medicine', 'Internal Medicine', 'Pediatrics', 'Surgery', 'Emergency Medicine', 'Psychiatry'];
const DISTANCES = [10, 25, 50, 100];

export default function PremiumSearchPanel({
  city,
  county,
  specialty,
  distance,
  cities,
  counties,
  onCityChange,
  onCountyChange,
  onSpecialtyChange,
  onDistanceChange,
  onUseLocation,
  onReset,
  onSave,
  locationStatus
}) {
  return (
    <section className="premium-search-panel" aria-label="Advanced opportunity filters">
      <div className="premium-search-heading">
        <span><SlidersHorizontal size={17} /> Advanced filters</span>
        <button type="button" onClick={onReset}><RotateCcw size={15} /> Reset</button>
      </div>

      <div className="premium-search-grid">
        <label>
          <span>City</span>
          <input list="openvol-cities" value={city} onChange={event => onCityChange(event.target.value)} placeholder="Any city" />
          <datalist id="openvol-cities">{cities.map(value => <option key={value} value={value} />)}</datalist>
        </label>

        <label>
          <span>County</span>
          <input list="openvol-counties" value={county} onChange={event => onCountyChange(event.target.value)} placeholder="Any county" />
          <datalist id="openvol-counties">{counties.map(value => <option key={value} value={value} />)}</datalist>
        </label>

        <label>
          <span>Distance</span>
          <select value={distance} onChange={event => onDistanceChange(Number(event.target.value))}>
            <option value={0}>Any distance</option>
            {DISTANCES.map(value => <option key={value} value={value}>Within {value} miles</option>)}
          </select>
        </label>

        <button type="button" className="use-location-button" onClick={onUseLocation}>
          <MapPin size={16} /> {locationStatus || 'Use my location'}
        </button>
      </div>

      <div className="specialty-filter" role="group" aria-label="Filter by specialty">
        {SPECIALTIES.map(value => (
          <button key={value} type="button" className={specialty === value ? 'active' : ''} onClick={() => onSpecialtyChange(specialty === value ? '' : value)} aria-pressed={specialty === value}>
            {value}
          </button>
        ))}
      </div>

      <button type="button" className="save-search-button" onClick={onSave}><BookmarkPlus size={16} /> Save this search</button>
    </section>
  );
}
