import { supabase } from './supabase';

const LEGACY_VISITOR_KEYS = [
  'worldsavers_visitor_id',
  'openvol_anonymous_visitor_id'
];

function clearLegacyTrackingData() {
  if (typeof window === 'undefined') return;

  for (const key of LEGACY_VISITOR_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }
}

clearLegacyTrackingData();

function safePath(value) {
  const text = String(value || '/').trim();
  if (!text || text === 'home') return '/';
  return text.startsWith('/') ? text.slice(0, 120) : `/${text}`.slice(0, 120);
}

function normalizeSearchTerm(filters) {
  const source = typeof filters === 'string'
    ? filters
    : filters?.searchText || filters?.query || '';

  return String(source)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

async function callMetric(functionName, parameters) {
  try {
    const { error } = await supabase.rpc(functionName, parameters);
    if (error) {
      console.warn(`Openvol metric ${functionName} was not recorded:`, error.message);
    }
  } catch (error) {
    console.warn(`Openvol metric ${functionName} was not recorded:`, error);
  }
}

/**
 * Build 72 privacy-first analytics
 *
 * These functions send only aggregate counter dimensions to Supabase RPCs.
 * They do not create visitor IDs and do not send email addresses, IP
 * addresses, user agents, browser fingerprints, referrers, exact location,
 * or any persistent identifier.
 */
export async function trackPageView(pagePath) {
  await callMetric('record_page_view', {
    p_page_path: safePath(pagePath)
  });
}

export async function trackClinicClick(clinicId) {
  if (!clinicId) return;
  await callMetric('record_clinic_click', {
    p_clinic_id: clinicId
  });
}

export async function trackOpportunityClick(opportunityId) {
  if (!opportunityId) return;
  await callMetric('record_opportunity_click', {
    p_opportunity_id: opportunityId
  });
}

export async function trackSearch(filters) {
  const searchTerm = normalizeSearchTerm(filters);
  if (!searchTerm) return;

  await callMetric('record_search', {
    p_search_term: searchTerm
  });
}

// Kept as compatibility exports for older components. They intentionally
// return no identifier and collect no device or browser information.
export function getOrCreateAnonymousId() {
  return null;
}

export function parseBrowser() {
  return null;
}

export function deviceType() {
  return null;
}

export async function ensureVisitor() {
  return null;
}
