const SPECIALTY_ALIASES = {
  'family medicine': ['family medicine', 'family practice', 'primary care'],
  'internal medicine': ['internal medicine', 'internist'],
  pediatrics: ['pediatrics', 'pediatric', 'children', 'child health'],
  surgery: ['surgery', 'surgical', 'surgeon'],
  'emergency medicine': ['emergency medicine', 'emergency room', 'er medicine', 'trauma'],
  psychiatry: ['psychiatry', 'psychiatric', 'mental health']
};

const CATEGORY_ALIASES = {
  shadowing: ['shadow', 'shadowing', 'observe', 'observership'],
  research: ['research', 'laboratory', 'lab'],
  rural: ['rural', 'underserved', 'critical access'],
  clinic: ['clinical', 'clinic', 'hospital', 'volunteer']
};

function includesAlias(text, aliases) {
  return aliases.some(alias => text.includes(alias));
}

export function parseSearchIntent(query, cities = [], counties = []) {
  const text = String(query || '').trim().toLowerCase();
  const intent = { category: '', specialty: '', city: '', county: '', distance: 0, nearMe: false };

  if (!text) return intent;

  Object.entries(SPECIALTY_ALIASES).some(([specialty, aliases]) => {
    if (!includesAlias(text, aliases)) return false;
    intent.specialty = specialty.replace(/\b\w/g, character => character.toUpperCase());
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

  const city = cities.find(value => text.includes(String(value).toLowerCase()));
  if (city) intent.city = city;

  const county = counties.find(value => {
    const normalized = String(value).replace(/ county$/i, '').toLowerCase();
    return text.includes(`${normalized} county`) || text.includes(`county of ${normalized}`);
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
