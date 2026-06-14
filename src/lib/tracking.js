import { supabase } from './supabase';

const VISITOR_ID_KEY = 'openvol_visitor_id';

function getOrCreateVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (!visitorId) {
    visitorId =
      crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
}

function getDeviceType() {
  const userAgent = navigator.userAgent || '';

  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'Tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) {
    return 'Mobile';
  }

  return 'Desktop';
}

function getBrowser() {
  const userAgent = navigator.userAgent || '';

  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';

  return 'Other';
}

function maskIpAddress(ipAddress) {
  if (!ipAddress) return null;

  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');

    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':').filter(Boolean);

    if (parts.length >= 3) {
      return `${parts.slice(0, 3).join(':')}::xxxx`;
    }
  }

  return ipAddress;
}

async function getVisitorNetworkInfo() {
  try {
    const response = await fetch('/cdn-cgi/trace');
    const text = await response.text();

    const data = {};

    text.split('\n').forEach((line) => {
      const [key, value] = line.split('=');

      if (key && value) {
        data[key] = value;
      }
    });

    return {
      ip_address: maskIpAddress(data.ip || null),
      country_code: data.loc || null,
      cloudflare_colo: data.colo || null,
      user_agent: navigator.userAgent || null,
    };
  } catch (error) {
    console.warn('Unable to capture visitor network info:', error);

    return {
      ip_address: null,
      country_code: null,
      cloudflare_colo: null,
      user_agent: navigator.userAgent || null,
    };
  }
}

export async function trackPageView(pagePath = window.location.pathname) {
  try {
    const visitorId = getOrCreateVisitorId();
    const networkInfo = await getVisitorNetworkInfo();

    await supabase.from('visitors').upsert(
      {
        visitor_id: visitorId,
        device_type: getDeviceType(),
        browser: getBrowser(),
        ip_address: networkInfo.ip_address,
        country_code: networkInfo.country_code,
        cloudflare_colo: networkInfo.cloudflare_colo,
        user_agent: networkInfo.user_agent,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'visitor_id',
      }
    );

    await supabase.from('page_views').insert({
      visitor_id: visitorId,
      page_path: pagePath,
      device_type: getDeviceType(),
      browser: getBrowser(),
      ip_address: networkInfo.ip_address,
      country_code: networkInfo.country_code,
      cloudflare_colo: networkInfo.cloudflare_colo,
      user_agent: networkInfo.user_agent,
    });
  } catch (error) {
    console.warn('Unable to track page view:', error);
  }
}

export async function trackClinicClick(clinicId, clickedUrl) {
  try {
    const visitorId = getOrCreateVisitorId();
    const networkInfo = await getVisitorNetworkInfo();

    await supabase.from('clinic_link_clicks').insert({
      visitor_id: visitorId,
      clinic_id: clinicId,
      clicked_url: clickedUrl,
      device_type: getDeviceType(),
      browser: getBrowser(),
      ip_address: networkInfo.ip_address,
      country_code: networkInfo.country_code,
      cloudflare_colo: networkInfo.cloudflare_colo,
      user_agent: networkInfo.user_agent,
    });
  } catch (error) {
    console.warn('Unable to track clinic click:', error);
  }
}

export async function trackSearch(filters) {
  try {
    const visitorId = getOrCreateVisitorId();
    const networkInfo = await getVisitorNetworkInfo();

    await supabase.from('search_events').insert({
      visitor_id: visitorId,
      search_text: filters?.searchText || '',
      city: filters?.city || '',
      county: filters?.county || '',
      minimum_age: filters?.minimumAge || null,
      device_type: getDeviceType(),
      browser: getBrowser(),
      ip_address: networkInfo.ip_address,
      country_code: networkInfo.country_code,
      cloudflare_colo: networkInfo.cloudflare_colo,
      user_agent: networkInfo.user_agent,
    });
  } catch (error) {
    console.warn('Unable to track search:', error);
  }
}
