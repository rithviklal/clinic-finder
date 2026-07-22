import React, { useMemo, useState } from 'react';
import MapLibreOpportunityMap from './OpportunityMapMapLibre';
import SearchToolbar from './SearchToolbar';
import FilterToolbar from './FilterToolbar';
import PremiumSearchPanel from './PremiumSearchPanel';
import { buildSuggestions, distanceMiles, parseSearchIntent, scoreOpportunity } from './searchIntent';

const EMPTY_FILTERS = { city: '', county: '', specialty: '', distance: 0 };

function unique(values) {
  return [...new Set(values.filter(Boolean).map(value => String(value).trim()))].sort((a, b) => a.localeCompare(b));
}

function normalized(value) {
  return String(value || '').trim().toLowerCase().replace(/ county$/, '');
}

export default function MapWorkspace({ items, categoryOf, navigate }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [manualFilters, setManualFilters] = useState(EMPTY_FILTERS);
  const [origin, setOrigin] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const cities = useMemo(() => unique(items.map(item => item.city)), [items]);
  const counties = useMemo(() => unique(items.map(item => String(item.county || '').replace(/ County$/i, ''))), [items]);
  const intent = useMemo(() => parseSearchIntent(query, cities, counties), [query, cities, counties]);

  const effectiveFilters = useMemo(() => ({
    category: intent.category || category,
    city: manualFilters.city || intent.city,
    county: manualFilters.county || intent.county,
    specialty: manualFilters.specialty || intent.specialty,
    distance: manualFilters.distance || intent.distance
  }), [intent, category, manualFilters]);

  const suggestions = useMemo(
    () => buildSuggestions(query, items, cities, counties),
    [query, items, cities, counties]
  );

  const ranked = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    const hasStructuredFilters = effectiveFilters.category !== 'all'
      || effectiveFilters.city
      || effectiveFilters.county
      || effectiveFilters.specialty
      || (effectiveFilters.distance && origin);

    return items
      .map(item => scoreOpportunity(item, effectiveFilters, categoryOf, origin, query))
      .filter(item => {
        if (effectiveFilters.category !== 'all' && categoryOf(item) !== effectiveFilters.category) return false;
        if (effectiveFilters.city && normalized(item.city) !== normalized(effectiveFilters.city)) return false;
        if (effectiveFilters.county && normalized(item.county) !== normalized(effectiveFilters.county)) return false;

        if (effectiveFilters.specialty) {
          const specialtyText = [item.specialty, item.title, item.organization, item.notes, item.opportunity_type]
            .filter(Boolean).join(' ').toLowerCase();
          if (!specialtyText.includes(effectiveFilters.specialty.toLowerCase())) return false;
        }

        if (effectiveFilters.distance && origin) {
          const miles = distanceMiles(origin, item);
          if (miles === null || miles > effectiveFilters.distance) return false;
        }

        if (!queryText || hasStructuredFilters) return true;
        const haystack = [item.title, item.organization, item.city, item.county, item.notes, item.specialty, item.opportunity_type, item.opportunity_category]
          .filter(Boolean).join(' ').toLowerCase();
        return queryText.split(/\s+/).filter(word => word.length > 2).some(word => haystack.includes(word));
      })
      .sort((a, b) => b.matchScore - a.matchScore || String(a.title || a.organization || '').localeCompare(String(b.title || b.organization || '')));
  }, [items, effectiveFilters, categoryOf, origin, query]);

  const activeFilters = useMemo(() => [
    effectiveFilters.category !== 'all' && { key: 'category', label: effectiveFilters.category === 'clinic' ? 'Clinical' : effectiveFilters.category },
    effectiveFilters.specialty && { key: 'specialty', label: effectiveFilters.specialty },
    effectiveFilters.city && { key: 'city', label: effectiveFilters.city },
    effectiveFilters.county && { key: 'county', label: `${String(effectiveFilters.county).replace(/ County$/i, '')} County` },
    effectiveFilters.distance > 0 && { key: 'distance', label: `Within ${effectiveFilters.distance} miles` },
    intent.nearMe && { key: 'nearMe', label: 'Near me' }
  ].filter(Boolean), [effectiveFilters, intent.nearMe]);

  function submitSearch(event) {
    event.preventDefault();
    if (intent.nearMe && !origin) useLocation();
  }

  function selectSuggestion(suggestion) {
    setQuery(suggestion.value);
  }

  function updateFilter(key, value) {
    setManualFilters(current => ({ ...current, [key]: value }));
    setSaveStatus('');
  }

  function removeFilter(key) {
    if (key === 'category') setCategory('all');
    else if (key === 'nearMe') {
      setOrigin(null);
      setLocationStatus('');
    } else updateFilter(key, key === 'distance' ? 0 : '');

    if (intent[key] || (key === 'nearMe' && intent.nearMe)) setQuery('');
  }

  function resetFilters() {
    setQuery('');
    setCategory('all');
    setManualFilters(EMPTY_FILTERS);
    setOrigin(null);
    setLocationStatus('');
    setSaveStatus('');
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Location unavailable');
      return;
    }

    setLocationStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      position => {
        setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus('Using your location');
        if (!manualFilters.distance && !intent.distance) updateFilter('distance', 25);
      },
      () => setLocationStatus('Location permission needed'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function saveSearch() {
    setSaveStatus('Saved for this session');
  }

  return (
    <section className="map-workspace" aria-label="Explore Georgia healthcare opportunities">
      <SearchToolbar
        query={query}
        onQueryChange={setQuery}
        onSubmit={submitSearch}
        suggestions={suggestions}
        onSuggestionSelect={selectSuggestion}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
      />

      <FilterToolbar category={effectiveFilters.category} onCategoryChange={setCategory} resultCount={ranked.length} />

      <PremiumSearchPanel
        city={effectiveFilters.city}
        county={effectiveFilters.county}
        specialty={effectiveFilters.specialty}
        distance={effectiveFilters.distance}
        cities={cities}
        counties={counties}
        onCityChange={value => updateFilter('city', value)}
        onCountyChange={value => updateFilter('county', value)}
        onSpecialtyChange={value => updateFilter('specialty', value)}
        onDistanceChange={value => updateFilter('distance', value)}
        onUseLocation={useLocation}
        onReset={resetFilters}
        onSave={saveSearch}
        locationStatus={locationStatus}
      />

      {(saveStatus || (effectiveFilters.distance > 0 && !origin)) && (
        <div className="search-status" role="status">
          {saveStatus || 'Choose “Use my location” to apply the distance filter.'}
        </div>
      )}

      <MapLibreOpportunityMap items={ranked.slice(0, 120)} premium />
    </section>
  );
}
