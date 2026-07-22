export const SPECIALTY_ALIASES = {
  'Family Medicine': ['family medicine', 'family practice', 'primary care'],
  'Internal Medicine': ['internal medicine', 'internist'],
  Pediatrics: ['pediatrics', 'pediatric', 'children', 'child health'],
  Surgery: ['surgery', 'surgical', 'surgeon'],
  'Emergency Medicine': ['emergency medicine', 'emergency room', 'er medicine', 'trauma'],
  Psychiatry: ['psychiatry', 'psychiatric', 'mental health'],
  Cardiology: ['cardiology', 'cardiac', 'heart'],
  Neurology: ['neurology', 'neurologic', 'brain'],
  Oncology: ['oncology', 'cancer'],
  Dermatology: ['dermatology', 'skin']
};

export const CATEGORY_ALIASES = {
  shadowing: ['shadow', 'shadowing', 'observe', 'observership'],
  research: ['research', 'laboratory', 'lab'],
  rural: ['rural', 'underserved', 'critical access'],
  clinic: ['clinical', 'clinic', 'hospital', 'volunteer']
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function includesAlias(text, aliases) {
  return aliases.some(alias => text.includes(alias));
}

export function parseSearchIntent(query, cities = [], counties = []) {
  const text = normalize(query);
  const intent = { category: '', specialty: '', city: '', county: '', distance: 0, nearMe: false };
  if (!text) return intent;

  Object.entries(SPECIALTY_ALIASES).some(([specialty, aliases]) => {
    if (!includesAlias(text, aliases)) return false;
    intent.specialty = specialty;
    return true;
  });

  Object.entries(CATEGORY_ALIASES).some(([category, aliases]) => {
    if (!includesAlias(text, aliases)) return false;
    intent.category = category;
    return true;
  });

  const distanceMatch = text.match(/(?:within|under|less than|up to)?\s*(10|25|50|100)\s*(?:mi|mile|miles)\b/);
  if (distanceMatch) intent.distance = Number(distanceMatch[1]);
  intent.nearMe = /\bnear me\b|\bclose to me\b|\bnearby\b/.test(text);

  const city = cities.find(value => text.includes(normalize(value)));
  if (city) intent.city = city;

  const county = counties.find(value => {
    const countyName = normalize(value).replace(/ county$/i, '');
    return text.includes(`${countyName} county`) || text.includes(`county of ${countyName}`);
  });
  if (county) intent.county = county;

  return intent;
}

export function distanceMiles(origin, item) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (!origin || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const radians = value => value * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = radians(latitude - origin.latitude);
  const deltaLongitude = radians(longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const itemLatitude = radians(latitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(itemLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreOpportunity(item, filters, categoryOf, origin, query) {
  const reasons = [];
  let score = 0;
  const itemCategory = categoryOf(item);
  const itemText = [item.title, item.organization, item.city, item.county, item.notes, item.specialty, item.opportunity_type, item.opportunity_category]
    .filter(Boolean).join(' ').toLowerCase();

  if (filters.category && filters.category !== 'all' && itemCategory === filters.category) {
    score += 30;
    reasons.push(filters.category === 'clinic' ? 'Clinical opportunity' : `${filters.category[0].toUpperCase()}${filters.category.slice(1)} opportunity`);
  }
  if (filters.specialty && itemText.includes(normalize(filters.specialty))) {
    score += 45;
    reasons.push(filters.specialty);
  }
  if (filters.city && normalize(item.city) === normalize(filters.city)) {
    score += 25;
    reasons.push(item.city);
  }
  if (filters.county && normalize(item.county).replace(/ county$/, '') === normalize(filters.county).replace(/ county$/, '')) {
    score += 20;
    reasons.push(`${item.county} County`);
  }

  const miles = distanceMiles(origin, item);
  if (filters.distance && miles !== null && miles <= filters.distance) {
    score += Math.max(10, 30 - Math.round(miles / 3));
    reasons.push(`${Math.round(miles)} miles away`);
  }

  const words = normalize(query).split(/\s+/).filter(word => word.length > 2);
  const textMatches = words.filter(word => itemText.includes(word)).length;
  score += Math.min(textMatches * 4, 20);
  if (textMatches) reasons.push('Matches your search');

  return { ...item, matchScore: score, matchReasons: [...new Set(reasons)].slice(0, 4), distanceMiles: miles };
}

export function buildSuggestions(query, items, cities, counties) {
  const text = normalize(query);
  if (text.length < 2) return [];
  const suggestions = [];

  Object.keys(SPECIALTY_ALIASES).forEach(specialty => {
    if (normalize(specialty).includes(text) || SPECIALTY_ALIASES[specialty].some(alias => alias.includes(text))) {
      suggestions.push({ label: specialty, value: specialty, type: 'Specialty' });
    }
  });
  cities.filter(city => normalize(city).includes(text)).slice(0, 3).forEach(city => suggestions.push({ label: city, value: city, type: 'City' }));
  counties.filter(county => normalize(county).includes(text)).slice(0, 2).forEach(county => suggestions.push({ label: `${county} County`, value: `${county} County`, type: 'County' }));
  items.filter(item => normalize(item.title || item.organization).includes(text)).slice(0, 3).forEach(item => suggestions.push({ label: item.title || item.organization, value: item.title || item.organization, type: 'Opportunity' }));

  return suggestions.filter((suggestion, index, all) => all.findIndex(candidate => candidate.label === suggestion.label) === index).slice(0, 7);
}
