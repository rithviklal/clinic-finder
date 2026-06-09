import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function detectAvailability(text) {
  const unavailablePatterns = [
    'volunteering is not available',
    'volunteer opportunities are not available',
    'not accepting volunteers',
    'we are not accepting volunteers',
    'currently not accepting volunteers',
    'volunteer program is closed',
    'applications are closed',
    'no volunteer opportunities',
    'shadowing is not available',
    'no shadowing opportunities',
    'we do not offer shadowing',
    'shadowing unavailable'
  ];

  const shadowingUnavailablePatterns = [
    'shadowing is not available',
    'no shadowing opportunities',
    'we do not offer shadowing',
    'shadowing unavailable'
  ];

  const volunteerUnavailable = unavailablePatterns.some((p) => text.includes(p));
  const shadowingUnavailable = shadowingUnavailablePatterns.some((p) => text.includes(p));

  return {
    availability_status: volunteerUnavailable ? 'unavailable' : 'available',
    volunteering_available: !volunteerUnavailable,
    shadowing_available: shadowingUnavailable ? false : null
  };
}

function extractRequirements(text) {
  const requirementKeywords = [
    'background check',
    'orientation',
    'training',
    'application',
    'immunization',
    'vaccination',
    'tb test',
    'minimum age',
    'must be',
    'commitment',
    'hours',
    'HIPAA',
    'consent',
    'parent',
    'guardian',
    'high school',
    'college',
    'medical student',
    'shadowing'
  ];

  const sentences = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 260);

  const matches = sentences.filter((sentence) =>
    requirementKeywords.some((keyword) => sentence.includes(keyword.toLowerCase()))
  );

  return matches.slice(0, 5).join('. ');
}

async function checkClinic(clinic) {
  const url = clinic.volunteer_url || clinic.website_url;

  if (!url) return;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenvolBot/1.0 Student healthcare volunteer directory'
      }
    });

    const html = await response.text();
    const text = cleanText(html);
    const newHash = hashText(text);
    const oldHash = clinic.source_hash;
    const changeDetected = oldHash && oldHash !== newHash;

    const detected = detectAvailability(text);
    const detectedRequirements = extractRequirements(text);

    const newRequirements = detectedRequirements || clinic.requirements;

    const meaningfulChange =
      changeDetected ||
      clinic.requirements !== newRequirements ||
      clinic.availability_status !== detected.availability_status ||
      clinic.volunteering_available !== detected.volunteering_available ||
      clinic.shadowing_available !== detected.shadowing_available;

    await supabase.from('clinic_site_checks').insert({
      clinic_id: clinic.id,
      clinic_name: clinic.clinic_name,
      checked_url: url,
      old_hash: oldHash,
      new_hash: newHash,
      change_detected: meaningfulChange,
      old_requirements: clinic.requirements,
      new_requirements: newRequirements,
      old_availability_status: clinic.availability_status,
      new_availability_status: detected.availability_status,
      old_volunteering_available: clinic.volunteering_available,
      new_volunteering_available: detected.volunteering_available,
      old_shadowing_available: clinic.shadowing_available,
      new_shadowing_available: detected.shadowing_available,
      status: response.ok ? 'success' : 'http_error',
      notes: `HTTP ${response.status}`
    });

    await supabase
      .from('clinics')
      .update({
        requirements: newRequirements,
        availability_status: detected.availability_status,
        volunteering_available: detected.volunteering_available,
        shadowing_available: detected.shadowing_available,
        source_hash: newHash,
        last_checked_at: new Date().toISOString(),
        last_change_detected_at: meaningfulChange
          ? new Date().toISOString()
          : clinic.last_change_detected_at,
        check_status: response.ok ? 'success' : 'http_error',
        check_notes: `HTTP ${response.status}`
      })
      .eq('id', clinic.id);

    console.log(`${meaningfulChange ? 'UPDATED' : 'NO CHANGE'} - ${clinic.clinic_name}`);
  } catch (error) {
    await supabase
      .from('clinics')
      .update({
        last_checked_at: new Date().toISOString(),
        check_status: 'failed',
        check_notes: error.message
      })
      .eq('id', clinic.id);

    console.log(`FAILED - ${clinic.clinic_name}: ${error.message}`);
  }
}

async function main() {
  const { data: clinics, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('active_status', true);

  if (error) throw error;

  for (const clinic of clinics) {
    await checkClinic(clinic);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

main();