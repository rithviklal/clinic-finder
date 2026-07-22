import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers3, LocateFixed, Maximize2, RotateCcw, Search, Sparkles } from 'lucide-react';
import './map.css';

const GEORGIA_CENTER = [-83.35, 32.75];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const COUNTY_SOURCE_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query?where=STATE%3D%2713%27&outFields=BASENAME%2CGEOID&returnGeometry=true&outSR=4326&f=geojson";

const CATEGORY_COLORS = {
  clinic: '#1769e0',
  rural: '#159a68',
  shadowing: '#7c3aed',
  research: '#d97706'
};

const REGION_FEATURES = {
  type: 'FeatureCollection',
  features: [
    ['Northwest Georgia', -85.05, 34.55, 54],
    ['Northeast Georgia', -83.35, 34.45, 58],
    ['Metro Atlanta', -84.39, 33.75, 46],
    ['West Central', -84.95, 32.75, 55],
    ['Central Georgia', -83.65, 32.65, 56],
    ['East Central', -82.55, 33.15, 52],
    ['Southwest Georgia', -84.35, 31.35, 62],
    ['South Central', -83.25, 31.35, 58],
    ['Coastal Georgia', -81.45, 31.65, 58]
  ].map(([name, longitude, latitude, radius]) => ({
    type: 'Feature',
    properties: { name, radius },
    geometry: { type: 'Point', coordinates: [longitude, latitude] }
  }))
};

function validCoordinates(item) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0);
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
  return {
    type: 'FeatureCollection',
    features: items.filter(validCoordinates).map(item => {
      const category = ruralMode ? 'rural' : categoryOf(item);
      return {
        type: 'Feature',
        id: `${item.kind}-${item.id}`,
        geometry: { type: 'Point', coordinates: [Number(item.longitude), Number(item.latitude)] },
        properties: {
          key: `${item.kind}-${item.id}`,
          title: item.title || item.organization || 'Opportunity',
          organization: item.organization || '',
          city: item.city || 'Georgia',
          county: item.county || '',
          category,
          color: CATEGORY_COLORS[category],
          itemIndex: items.indexOf(item)
        }
      };
    })
  };
}

export default function MapLibreOpportunityMap({ items, activeId, onSelect, ruralMode = false, premium = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const itemsRef = useRef(items);
  const [mapReady, setMapReady] = useState(false);
  const [showCounties, setShowCounties] = useState(ruralMode);
  const [showRegions, setShowRegions] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const [searchBounds, setSearchBounds] = useState(null);
  const [showAreaSearch, setShowAreaSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(items.filter(validCoordinates).length);

  const mappedItems = useMemo(() => {
    const valid = items.filter(validCoordinates);
    if (!searchBounds) return valid;
    return valid.filter(item => searchBounds.contains([Number(item.longitude), Number(item.latitude)]));
  }, [items, searchBounds]);

  const geoJson = useMemo(() => asGeoJson(mappedItems, ruralMode), [mappedItems, ruralMode]);

  useEffect(() => { itemsRef.current = mappedItems; }, [mappedItems]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: GEORGIA_CENTER,
      zoom: 6.35,
      minZoom: 5.4,
      maxZoom: 17,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl({ container: containerRef.current.parentElement }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: { maxZoom: 11 }
    }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', async () => {
      map.addSource('opportunities', {
        type: 'geojson',
        data: asGeoJson(itemsRef.current, ruralMode),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 54,
        clusterProperties: {
          clinic: ['+', ['case', ['==', ['get', 'category'], 'clinic'], 1, 0]],
          rural: ['+', ['case', ['==', ['get', 'category'], 'rural'], 1, 0]]
        }
      });

      map.addLayer({
        id: 'opportunity-clusters-halo',
        type: 'circle',
        source: 'opportunities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'rgba(255,255,255,.88)',
          'circle-radius': ['step', ['get', 'point_count'], 24, 20, 30, 60, 37],
          'circle-blur': 0.05,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(11,31,51,.12)'
        }
      });

      map.addLayer({
        id: 'opportunity-clusters',
        type: 'circle',
        source: 'opportunities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#1769e0', 20, '#125bbf', 60, '#0b3f86'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 20, 24, 60, 31],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'opportunities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12
        },
        paint: { 'text-color': '#ffffff' }
      });

      map.addLayer({
        id: 'opportunity-points-halo',
        type: 'circle',
        source: 'opportunities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['==', ['get', 'key'], activeId || ''], 14, 11],
          'circle-color': '#ffffff',
          'circle-opacity': ['case', ['all', ['!=', activeId || '', ''], ['!=', ['get', 'key'], activeId || '']], 0.55, 1]
        }
      });

      map.addLayer({
        id: 'opportunity-points',
        type: 'circle',
        source: 'opportunities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['==', ['get', 'key'], activeId || ''], 10, 7.5],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': ['case', ['all', ['!=', activeId || '', ''], ['!=', ['get', 'key'], activeId || '']], 0.42, 1]
        }
      });

      map.addSource('georgia-regions', { type: 'geojson', data: REGION_FEATURES });
      map.addLayer({
        id: 'region-circles',
        type: 'circle',
        source: 'georgia-regions',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['*', ['get', 'radius'], 0.62], 8, ['*', ['get', 'radius'], 1.55]],
          'circle-color': 'rgba(23,105,224,.09)',
          'circle-stroke-color': 'rgba(23,105,224,.38)',
          'circle-stroke-width': 1.5
        }
      });
      map.addLayer({
        id: 'region-labels',
        type: 'symbol',
        source: 'georgia-regions',
        layout: { visibility: 'none', 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': false },
        paint: { 'text-color': '#0b3f86', 'text-halo-color': 'rgba(255,255,255,.9)', 'text-halo-width': 2 }
      });

      try {
        const response = await fetch(COUNTY_SOURCE_URL);
        if (!response.ok) throw new Error(`County request failed: ${response.status}`);
        const counties = await response.json();
        map.addSource('georgia-counties', { type: 'geojson', data: counties });
        map.addLayer({
          id: 'county-fill',
          type: 'fill',
          source: 'georgia-counties',
          layout: { visibility: ruralMode ? 'visible' : 'none' },
          paint: { 'fill-color': '#1769e0', 'fill-opacity': 0.025 }
        });
        map.addLayer({
          id: 'county-lines',
          type: 'line',
          source: 'georgia-counties',
          layout: { visibility: ruralMode ? 'visible' : 'none' },
          paint: { 'line-color': '#52708c', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.45, 10, 1.25], 'line-opacity': 0.55 }
        });
        map.addLayer({
          id: 'county-labels',
          type: 'symbol',
          source: 'georgia-counties',
          minzoom: 7.2,
          layout: { visibility: ruralMode ? 'visible' : 'none', 'text-field': ['get', 'BASENAME'], 'text-size': 10, 'text-font': ['Noto Sans Regular'] },
          paint: { 'text-color': '#556b7e', 'text-halo-color': 'rgba(255,255,255,.95)', 'text-halo-width': 1.5 }
        });
      } catch (error) {
        console.warn('Georgia county overlay unavailable', error);
      }

      setMapReady(true);
    });

    map.on('click', 'opportunity-clusters', async event => {
      const feature = event.features?.[0];
      if (!feature) return;
      const source = map.getSource('opportunities');
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 650 });
    });

    map.on('click', 'opportunity-points', event => {
      const feature = event.features?.[0];
      if (!feature) return;
      const item = itemsRef.current.find(candidate => `${candidate.kind}-${candidate.id}` === feature.properties.key);
      if (item) onSelect?.(item);
      const place = [feature.properties.city, feature.properties.county ? `${feature.properties.county} County` : ''].filter(Boolean).join(', ');
      new maplibregl.Popup({ offset: 18, closeButton: false, className: 'openvol-map-popup' })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`<div class="map-popup-content"><span>${escapeHtml(feature.properties.category)}</span><b>${escapeHtml(feature.properties.title)}</b><small>${escapeHtml(place)}</small></div>`)
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getSource('opportunities')) return;
    map.getSource('opportunities').setData(geoJson);

    if (!searchBounds && geoJson.features.length) {
      if (geoJson.features.length === 1) {
        map.easeTo({ center: geoJson.features[0].geometry.coordinates, zoom: 10, duration: 700 });
      } else {
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
    const dimmed = ['all', ['!=', activeId || '', ''], ['!=', ['get', 'key'], activeId || '']];
    map.setPaintProperty('opportunity-points', 'circle-radius', ['case', ['==', ['get', 'key'], activeId || ''], 10, 7.5]);
    map.setPaintProperty('opportunity-points', 'circle-opacity', ['case', dimmed, 0.42, 1]);
    map.setPaintProperty('opportunity-points-halo', 'circle-radius', ['case', ['==', ['get', 'key'], activeId || ''], 14, 11]);
    map.setPaintProperty('opportunity-points-halo', 'circle-opacity', ['case', dimmed, 0.55, 1]);
  }, [activeId, mapReady]);

  function toggleLayer(layerIds, visible) {
    const map = mapRef.current;
    layerIds.forEach(id => { if (map?.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }

  function toggleCounties() {
    const next = !showCounties;
    setShowCounties(next);
    toggleLayer(['county-fill', 'county-lines', 'county-labels'], next);
  }

  function toggleRegions() {
    const next = !showRegions;
    setShowRegions(next);
    toggleLayer(['region-circles', 'region-labels'], next);
  }

  function toggle3d() {
    const next = !is3d;
    setIs3d(next);
    mapRef.current?.easeTo({ pitch: next ? 48 : 0, bearing: next ? -8 : 0, duration: 650 });
  }

  function searchThisArea() {
    const bounds = mapRef.current?.getBounds();
    if (!bounds) return;
    setSearchBounds(bounds);
    setShowAreaSearch(false);
  }

  function resetArea() {
    setSearchBounds(null);
    setShowAreaSearch(false);
  }

  function locate() {
    const control = containerRef.current?.parentElement?.querySelector('.maplibregl-ctrl-geolocate');
    control?.click();
  }

  function fullscreen() {
    const control = containerRef.current?.parentElement?.querySelector('.maplibregl-ctrl-fullscreen');
    control?.click();
  }

  return (
    <div className={`map-wrap maplibre-wrap ${ruralMode ? 'rural-map' : ''} ${premium ? 'premium-map' : ''}`}>
      <div ref={containerRef} className="main-map" aria-label="Interactive Georgia healthcare opportunity map" />

      <div className="premium-map-toolbar" aria-label="Map display controls">
        <button className={showCounties ? 'active' : ''} onClick={toggleCounties} title="Georgia county boundaries"><Layers3 size={16}/><span>Counties</span></button>
        <button className={showRegions ? 'active' : ''} onClick={toggleRegions} title="Georgia regions"><Sparkles size={16}/><span>Regions</span></button>
        <button className={is3d ? 'active' : ''} onClick={toggle3d} title="Tilt the map"><span className="three-d-icon">3D</span></button>
      </div>

      {showAreaSearch && !searchBounds && (
        <button className="search-this-area" onClick={searchThisArea}><Search size={16}/>Search this area</button>
      )}
      {searchBounds && (
        <button className="search-this-area reset-area" onClick={resetArea}><RotateCcw size={16}/>Show all Georgia</button>
      )}

      {premium && (
        <div className="premium-quick-controls">
          <button onClick={locate} title="Use my location"><LocateFixed size={17}/></button>
          <button onClick={fullscreen} title="Fullscreen map"><Maximize2 size={17}/></button>
        </div>
      )}

      <div className="map-legend">
        <span><i className="legend-dot clinical-dot"/>Clinical</span>
        <span><i className="legend-dot rural-dot"/>Rural Health</span>
        <span><i className="legend-dot shadow-dot"/>Shadowing</span>
        <span><i className="legend-dot research-dot"/>Research</span>
      </div>

      <div className="map-result-count"><b>{mappedItems.length}</b><span>{searchBounds ? 'in searched area' : 'mapped opportunities'}</span><small>{visibleCount} visible now</small></div>
    </div>
  );
}
