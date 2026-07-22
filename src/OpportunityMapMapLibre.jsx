import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Check, ChevronDown, Layers3, LocateFixed, Maximize2, RotateCcw, Search } from 'lucide-react';
import MapFooter from './MapFooter';
import './map.css';

const GEORGIA_CENTER = [-83.35, 32.75];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const COUNTY_SOURCE_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query?where=STATE%3D%2713%27&outFields=BASENAME%2CGEOID&returnGeometry=true&outSR=4326&f=geojson";
const CATEGORY_COLORS = { clinic: '#1769e0', rural: '#159a68', shadowing: '#7c3aed', research: '#d97706' };
const REGION_FEATURES = {
  type: 'FeatureCollection',
  features: [
    ['Northwest Georgia', -85.05, 34.55, 54], ['Northeast Georgia', -83.35, 34.45, 58],
    ['Metro Atlanta', -84.39, 33.75, 46], ['West Central', -84.95, 32.75, 55],
    ['Central Georgia', -83.65, 32.65, 56], ['East Central', -82.55, 33.15, 52],
    ['Southwest Georgia', -84.35, 31.35, 62], ['South Central', -83.25, 31.35, 58],
    ['Coastal Georgia', -81.45, 31.65, 58]
  ].map(([name, longitude, latitude, radius]) => ({
    type: 'Feature', properties: { name, radius }, geometry: { type: 'Point', coordinates: [longitude, latitude] }
  }))
};

function validCoordinates(item) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
}

function itemKey(item, index = 0) {
  return `${item.kind || 'opportunity'}-${item.id ?? item.objectid ?? index}`;
}

function isRural(item) {
  const ruralCounties = new Set(['Appling','Atkinson','Bacon','Baker','Ben Hill','Berrien','Bleckley','Brantley','Brooks','Bryan','Bulloch','Burke','Calhoun','Camden','Candler','Charlton','Chattooga','Clay','Clinch','Coffee','Colquitt','Cook','Crisp','Dade','Decatur','Dodge','Dooly','Early','Echols','Effingham','Elbert','Emanuel','Evans','Fannin','Franklin','Gilmer','Glascock','Grady','Greene','Habersham','Hancock','Haralson','Hart','Heard','Irwin','Jeff Davis','Jefferson','Jenkins','Johnson','Lanier','Laurens','Liberty','Lincoln','Long','Lumpkin','Macon','Marion','McDuffie','McIntosh','Miller','Mitchell','Montgomery','Morgan','Murray','Pierce','Polk','Pulaski','Putnam','Quitman','Rabun','Randolph','Schley','Screven','Seminole','Stephens','Stewart','Sumter','Talbot','Taliaferro','Tattnall','Taylor','Telfair','Terrell','Thomas','Tift','Toombs','Towns','Treutlen','Turner','Union','Ware','Warren','Washington','Wayne','Webster','Wheeler','White','Wilcox','Wilkes','Worth']);
  const text = `${item.county || ''} ${item.city || ''} ${item.notes || ''} ${item.volunteer_type || ''} ${item.opportunity_category || ''}`.toLowerCase();
  return ruralCounties.has(String(item.county || '').replace(/ County$/i, '')) || /rural|critical access|mobile clinic|community health center/.test(text);
}

function categoryOf(item) {
  const text = `${item.opportunity_category || ''} ${item.opportunity_type || ''} ${item.notes || ''}`.toLowerCase();
  if (/research|laboratory|lab/.test(text)) return 'research';
  if (/shadow/.test(text)) return 'shadowing';
  return isRural(item) ? 'rural' : 'clinic';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function asGeoJson(items, ruralMode) {
  const valid = items.filter(validCoordinates);
  return {
    type: 'FeatureCollection',
    features: valid.map((item, index) => {
      const category = ruralMode ? 'rural' : categoryOf(item);
      const score = Math.max(0, Math.min(100, Math.round(Number(item.matchScore) || 0)));
      return {
        type: 'Feature', id: itemKey(item, index),
        geometry: { type: 'Point', coordinates: [Number(item.longitude), Number(item.latitude)] },
        properties: {
          key: itemKey(item, index),
          title: item.title || item.organization || 'Opportunity',
          organization: item.organization || '',
          city: item.city || 'Georgia', county: item.county || '', category,
          specialty: item.specialty || '', opportunityType: item.opportunity_type || item.opportunity_category || '',
          color: CATEGORY_COLORS[category], score,
          reasons: Array.isArray(item.matchReasons) ? item.matchReasons.slice(0, 3).join('|') : '',
          distance: Number.isFinite(Number(item.distanceMiles)) ? Number(item.distanceMiles).toFixed(1) : '',
          best: index === 0 && score > 0 ? 1 : 0
        }
      };
    })
  };
}

export default function MapLibreOpportunityMap({ items, activeId, onSelect, ruralMode = false, premium = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const itemsRef = useRef(items);
  const menuRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [showCounties, setShowCounties] = useState(ruralMode);
  const [showRegions, setShowRegions] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [searchBounds, setSearchBounds] = useState(null);
  const [showAreaSearch, setShowAreaSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(items.filter(validCoordinates).length);

  const mappedItems = useMemo(() => {
    const valid = items.filter(validCoordinates);
    return searchBounds ? valid.filter(item => searchBounds.contains([Number(item.longitude), Number(item.latitude)])) : valid;
  }, [items, searchBounds]);
  const geoJson = useMemo(() => asGeoJson(mappedItems, ruralMode), [mappedItems, ruralMode]);

  useEffect(() => { itemsRef.current = mappedItems; }, [mappedItems]);
  useEffect(() => {
    const close = event => { if (!menuRef.current?.contains(event.target)) setLayersOpen(false); };
    const escape = event => { if (event.key === 'Escape') setLayersOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({ container: containerRef.current, style: MAP_STYLE, center: GEORGIA_CENTER, zoom: 6.35, minZoom: 5.4, maxZoom: 17, pitch: 0, bearing: 0, attributionControl: false });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl({ container: containerRef.current.parentElement }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true, fitBoundsOptions: { maxZoom: 11 } }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', async () => {
      map.addSource('opportunities', { type: 'geojson', data: asGeoJson(itemsRef.current, ruralMode), cluster: true, clusterMaxZoom: 12, clusterRadius: 54 });
      map.addLayer({ id: 'opportunity-clusters-halo', type: 'circle', source: 'opportunities', filter: ['has', 'point_count'], paint: { 'circle-color': 'rgba(255,255,255,.88)', 'circle-radius': ['step', ['get', 'point_count'], 24, 20, 30, 60, 37], 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(11,31,51,.12)' } });
      map.addLayer({ id: 'opportunity-clusters', type: 'circle', source: 'opportunities', filter: ['has', 'point_count'], paint: { 'circle-color': ['step', ['get', 'point_count'], '#1769e0', 20, '#125bbf', 60, '#0b3f86'], 'circle-radius': ['step', ['get', 'point_count'], 18, 20, 24, 60, 31], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'opportunities', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
      map.addLayer({ id: 'opportunity-points-halo', type: 'circle', source: 'opportunities', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'best'], 1], 16, ['interpolate', ['linear'], ['get', 'score'], 0, 10, 100, 13]], 'circle-color': ['case', ['==', ['get', 'best'], 1], 'rgba(245,158,11,.28)', '#fff'], 'circle-stroke-width': ['case', ['==', ['get', 'best'], 1], 2, 0], 'circle-stroke-color': '#f59e0b' } });
      map.addLayer({ id: 'opportunity-points', type: 'circle', source: 'opportunities', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'best'], 1], 9.5, ['interpolate', ['linear'], ['get', 'score'], 0, 7, 100, 9]], 'circle-color': ['get', 'color'], 'circle-stroke-width': ['case', ['==', ['get', 'best'], 1], 3, 2], 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'best-match-label', type: 'symbol', source: 'opportunities', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'best'], 1]], minzoom: 6, layout: { 'text-field': 'Best match', 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-offset': [0, -1.9], 'text-anchor': 'bottom', 'text-padding': 5 }, paint: { 'text-color': '#7c2d12', 'text-halo-color': '#fff', 'text-halo-width': 2 } });
      map.addSource('georgia-regions', { type: 'geojson', data: REGION_FEATURES });
      map.addLayer({ id: 'region-circles', type: 'circle', source: 'georgia-regions', layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['*', ['get', 'radius'], .62], 8, ['*', ['get', 'radius'], 1.55]], 'circle-color': 'rgba(23,105,224,.09)', 'circle-stroke-color': 'rgba(23,105,224,.38)', 'circle-stroke-width': 1.5 } });
      map.addLayer({ id: 'region-labels', type: 'symbol', source: 'georgia-regions', layout: { visibility: 'none', 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#0b3f86', 'text-halo-color': 'rgba(255,255,255,.9)', 'text-halo-width': 2 } });
      try {
        const response = await fetch(COUNTY_SOURCE_URL);
        if (!response.ok) throw new Error(`County request failed: ${response.status}`);
        const counties = await response.json();
        map.addSource('georgia-counties', { type: 'geojson', data: counties });
        const visibility = ruralMode ? 'visible' : 'none';
        map.addLayer({ id: 'county-fill', type: 'fill', source: 'georgia-counties', layout: { visibility }, paint: { 'fill-color': '#1769e0', 'fill-opacity': .025 } });
        map.addLayer({ id: 'county-lines', type: 'line', source: 'georgia-counties', layout: { visibility }, paint: { 'line-color': '#52708c', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, .45, 10, 1.25], 'line-opacity': .55 } });
        map.addLayer({ id: 'county-labels', type: 'symbol', source: 'georgia-counties', minzoom: 7.2, layout: { visibility, 'text-field': ['get', 'BASENAME'], 'text-size': 10, 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#556b7e', 'text-halo-color': 'rgba(255,255,255,.95)', 'text-halo-width': 1.5 } });
      } catch (error) { console.warn('Georgia county overlay unavailable', error); }
      setMapReady(true);
    });

    map.on('click', 'opportunity-clusters', async event => {
      const feature = event.features?.[0];
      if (!feature) return;
      const zoom = await map.getSource('opportunities').getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 650 });
    });
    map.on('click', 'opportunity-points', event => {
      const feature = event.features?.[0];
      if (!feature) return;
      const item = itemsRef.current.find((candidate, index) => itemKey(candidate, index) === feature.properties.key);
      if (item) onSelect?.(item);
      const county = String(feature.properties.county || '').replace(/ County$/i, '');
      const place = [feature.properties.city, county ? `${county} County` : ''].filter(Boolean).join(', ');
      const reasons = String(feature.properties.reasons || '').split('|').filter(Boolean);
      const score = Number(feature.properties.score || 0);
      const badges = [feature.properties.specialty, feature.properties.opportunityType].filter(Boolean).map(value => `<span>${escapeHtml(value)}</span>`).join('');
      const explanation = reasons.length ? `<div class="map-popup-reasons"><strong>Why this matched</strong><ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></div>` : '';
      const distance = feature.properties.distance ? `<small>${escapeHtml(feature.properties.distance)} miles away</small>` : '';
      const match = score > 0 ? `<div class="map-popup-score"><b>${score}%</b><span>${feature.properties.best ? 'Best match' : 'match'}</span></div>` : '';
      new maplibregl.Popup({ offset: 20, closeButton: true, className: 'openvol-map-popup', maxWidth: '340px' })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`<div class="map-popup-content">${match}<div class="map-popup-category">${escapeHtml(feature.properties.category)}</div><h3>${escapeHtml(feature.properties.title)}</h3>${feature.properties.organization ? `<p>${escapeHtml(feature.properties.organization)}</p>` : ''}<small>${escapeHtml(place)}</small>${distance}${badges ? `<div class="map-popup-badges">${badges}</div>` : ''}${explanation}</div>`)
        .addTo(map);
    });
    ['opportunity-clusters', 'opportunity-points'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });
    map.on('movestart', event => { if (event.originalEvent) setShowAreaSearch(true); });
    map.on('moveend', () => {
      const bounds = map.getBounds();
      setVisibleCount(itemsRef.current.filter(item => bounds.contains([Number(item.longitude), Number(item.latitude)])).length);
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getSource('opportunities')) return;
    map.getSource('opportunities').setData(geoJson);
    if (!searchBounds && geoJson.features.length) {
      if (geoJson.features.length === 1) map.easeTo({ center: geoJson.features[0].geometry.coordinates, zoom: 10, duration: 700 });
      else {
        const bounds = new maplibregl.LngLatBounds();
        geoJson.features.forEach(feature => bounds.extend(feature.geometry.coordinates));
        map.fitBounds(bounds, { padding: premium ? 76 : 50, maxZoom: 10, duration: 700 });
      }
    }
    setVisibleCount(geoJson.features.length);
  }, [geoJson, mapReady, premium, searchBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getLayer('opportunity-points')) return;
    const active = activeId || '';
    map.setPaintProperty('opportunity-points', 'circle-radius', ['case', ['==', ['get', 'key'], active], 11, ['==', ['get', 'best'], 1], 9.5, ['interpolate', ['linear'], ['get', 'score'], 0, 7, 100, 9]]);
    map.setPaintProperty('opportunity-points-halo', 'circle-radius', ['case', ['==', ['get', 'key'], active], 16, ['==', ['get', 'best'], 1], 16, ['interpolate', ['linear'], ['get', 'score'], 0, 10, 100, 13]]);
  }, [activeId, mapReady]);

  const setLayerVisibility = (ids, visible) => ids.forEach(id => { if (mapRef.current?.getLayer(id)) mapRef.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  const toggleCounties = () => { const next = !showCounties; setShowCounties(next); setLayerVisibility(['county-fill','county-lines','county-labels'], next); };
  const toggleRegions = () => { const next = !showRegions; setShowRegions(next); setLayerVisibility(['region-circles','region-labels'], next); };
  const toggle3d = () => { const next = !is3d; setIs3d(next); mapRef.current?.easeTo({ pitch: next ? 48 : 0, bearing: next ? -8 : 0, duration: 650 }); };
  const searchThisArea = () => { const bounds = mapRef.current?.getBounds(); if (bounds) { setSearchBounds(bounds); setShowAreaSearch(false); } };
  const resetArea = () => { setSearchBounds(null); setShowAreaSearch(false); };
  const locate = () => containerRef.current?.parentElement?.querySelector('.maplibregl-ctrl-geolocate')?.click();
  const fullscreen = () => containerRef.current?.parentElement?.querySelector('.maplibregl-ctrl-fullscreen')?.click();
  const activeLayerCount = [showCounties, showRegions, is3d].filter(Boolean).length;

  return (
    <div className={`map-wrap maplibre-wrap ${ruralMode ? 'rural-map' : ''} ${premium ? 'premium-map' : ''}`}>
      <div ref={containerRef} className="main-map" aria-label="Interactive Georgia healthcare opportunity map" />
      <div className="layers-control" ref={menuRef}>
        <button type="button" className={`layers-trigger ${layersOpen ? 'open' : ''}`} onClick={() => setLayersOpen(open => !open)} aria-expanded={layersOpen} aria-haspopup="menu">
          <Layers3 size={17} /><span>Layers</span>{activeLayerCount > 0 && <small>{activeLayerCount}</small>}<ChevronDown size={15} />
        </button>
        {layersOpen && <div className="layers-menu" role="menu" aria-label="Map layers">
          <button type="button" role="menuitemcheckbox" aria-checked={showCounties} onClick={toggleCounties}><span><b>County boundaries</b><small>Show county lines and labels</small></span>{showCounties && <Check size={17} />}</button>
          <button type="button" role="menuitemcheckbox" aria-checked={showRegions} onClick={toggleRegions}><span><b>Georgia regions</b><small>Display regional service areas</small></span>{showRegions && <Check size={17} />}</button>
          <button type="button" role="menuitemcheckbox" aria-checked={is3d} onClick={toggle3d}><span><b>3D perspective</b><small>Tilt the map for added depth</small></span>{is3d && <Check size={17} />}</button>
        </div>}
      </div>
      {showAreaSearch && !searchBounds && <button type="button" className="search-this-area" onClick={searchThisArea}><Search size={16} />Search this area</button>}
      {searchBounds && <button type="button" className="search-this-area reset-area" onClick={resetArea}><RotateCcw size={16} />Show all Georgia</button>}
      {premium && <div className="premium-quick-controls" aria-label="Map quick controls"><button type="button" onClick={locate} title="Use my location" aria-label="Use my location"><LocateFixed size={17} /></button><button type="button" onClick={fullscreen} title="Fullscreen map" aria-label="Fullscreen map"><Maximize2 size={17} /></button></div>}
      <MapFooter mappedCount={mappedItems.length} visibleCount={visibleCount} areaFiltered={Boolean(searchBounds)} />
    </div>
  );
}
