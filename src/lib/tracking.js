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
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }
}

clearLegacyTrackingData();

/**
 * Build 72 privacy mode
 *
 * Openvol does not create visitor identifiers or transmit page views,
 * searches, clicks, browser details, device details, referrers, or location
 * information. These compatibility functions intentionally perform no work
 * so existing UI code can call them safely without collecting data.
 */
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

export async function trackPageView() {
  return undefined;
}

export async function trackClinicClick() {
  return undefined;
}

export async function trackOpportunityClick() {
  return undefined;
}

export async function trackSearch() {
  return undefined;
}
