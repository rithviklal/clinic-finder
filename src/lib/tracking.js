import { supabase } from './supabase';

const VISITOR_KEY = 'worldsavers_visitor_id';

export function getOrCreateAnonymousId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function parseBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

export function deviceType() {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
}

export async function ensureVisitor() {
  const anonymousId = getOrCreateAnonymousId();
  const { data: existing } = await supabase
    .from('visitors')
    .select('*')
    .eq('anonymous_visitor_id', anonymousId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('visitors')
      .update({ last_visit_at: new Date().toISOString(), visit_count: (existing.visit_count || 0) + 1, user_agent: navigator.userAgent })
      .eq('id', existing.id);
    return existing;
  }

  const { data } = await supabase
    .from('visitors')
    .insert({ anonymous_visitor_id: anonymousId, user_agent: navigator.userAgent })
    .select()
    .single();
  return data;
}

export async function trackPageView(pageUrl, clinicId = null) {
  const visitor = await ensureVisitor();
  if (!visitor) return;
  await supabase.from('page_views').insert({ visitor_id: visitor.id, page_url: pageUrl, clinic_id: clinicId });
}

export async function trackClinicClick(clinicId, clickedUrl) {
  const visitor = await ensureVisitor();
  if (!visitor) return;
  await supabase.from('clinic_link_clicks').insert({
    visitor_id: visitor.id,
    clinic_id: clinicId,
    clicked_url: clickedUrl,
    device_type: deviceType(),
    browser: parseBrowser()
  });
}

export async function trackOpportunityClick(opportunityId, clickedUrl) {
  const visitor = await ensureVisitor();

  if (!visitor) {
    console.error('OPPORTUNITY CLICK NOT TRACKED: visitor was not created or found.');
    return;
  }

  const { error } = await supabase.from('opportunity_link_clicks').insert({
    visitor_id: visitor.id,
    opportunity_id: opportunityId,
    clicked_url: clickedUrl,
    device_type: deviceType(),
    browser: parseBrowser(),
    clicked_at: new Date().toISOString(),
  });

  if (error) {
    console.error('OPPORTUNITY CLICK INSERT ERROR:', error);
  }
}

export async function trackSearch(filters) {
  const visitor = await ensureVisitor();
  if (!visitor) return;
  await supabase.from('search_events').insert({
    visitor_id: visitor.id,
    search_text: filters.searchText || '',
    city_filter: filters.city || '',
    county_filter: filters.county || '',
    minimum_age_filter: filters.minimumAge ? Number(filters.minimumAge) : null
  });
}
