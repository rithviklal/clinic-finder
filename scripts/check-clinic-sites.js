import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function parseDateText(value) {
  if (!value) return null;

  const cleaned = value.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function extractDates(text) {
  const results = {
    application_start_date: null,
    application_end_date: null,
    program_start_date: null,
    program_end_date: null,
  };

  const datePattern =
    '([a-z]+\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})';

  const patterns = [
    {
      key: 'application_start_date',
      regex: new RegExp(
        `applications?\\s+(open|opens|begin|begins|start|starts)\\s*(on)?\\s*${datePattern}`,
        'i'
      ),
    },
    {
      key: 'application_end_date',
      regex: new RegExp(
        `applications?\\s+(close|closes|end|ends|due)\\s*(on|by)?\\s*${datePattern}`,
        'i'
      ),
    },
    {
      key: 'application_end_date',
      regex: new RegExp(`deadline\\s*(is|:)?\\s*${datePattern}`, 'i'),
    },
    {
      key: 'application_end_date',
      regex: new RegExp(`apply\\s+by\\s*${datePattern}`, 'i'),
    },
    {
      key: 'program_start_date',
      regex: new RegExp(
        `program\\s+(starts|begins|start date|begin date)\\s*(on)?\\s*${datePattern}`,
        'i'
      ),
    },
    {
      key: 'program_end_date',
      regex: new RegExp(
        `program\\s+(ends|end date)\\s*(on)?\\s*${datePattern}`,
        'i'
      ),
    },
  ];

  for (const item of patterns) {
    const match = text.match(item.regex);

    if (match) {
      const rawDate = match[match.length - 1];
      const parsed = parseDateText(rawDate);

      if (parsed && !results[item.key]) {
        results[item.key] = parsed;
      }
    }
  }

  return results;
}

function determineDateStatus(dates) {
  const today = new Date();
  const todayOnly = new Date(today.toISOString().slice(0, 10));

  if (dates.application_start_date) {
    const start = new Date(dates.application_start_date);

    if (todayOnly < start) {
      return {
        date_status: 'not_open_yet',
        availability_status: 'limited',
        summary: `Applications open on ${dates.application_start_date}.`,
      };
    }
  }

  if (dates.application_end_date) {
    const end = new Date(dates.application_end_date);

    if (todayOnly > end) {
      return {
        date_status: 'closed_by_date',
        availability_status: 'closed',
        summary: `Application deadline passed on ${dates.application_end_date}.`,
      };
    }
  }

  if (dates.program_end_date) {
    const programEnd = new Date(dates.program_end_date);

    if (todayOnly > programEnd) {
      return {
        date_status: 'program_ended',
        availability_status: 'closed',
        summary: `Program ended on ${dates.program_end_date}.`,
      };
    }
  }

  return {
    date_status: 'date_ok',
    availability_status: null,
    summary: null,
  };
}

function detectAvailability(text) {
  const waitlistPatterns = [
    'waitlist only',
    'join the waitlist',
    'waiting list',
    'wait list',
    'waitlisted',
  ];

  const closedPatterns = [
    'applications are closed',
    'applications closed',
    'application period is closed',
    'registration closed',
    'deadline has passed',
    'no longer accepting applications',
    'not accepting applications',
  ];

  const unavailablePatterns = [
    'not accepting volunteers',
    'currently not accepting volunteers',
    'volunteering is not available',
    'volunteer opportunities are not available',
    'no volunteer opportunities',
    'shadowing is not available',
    'no shadowing opportunities',
    'we do not offer shadowing',
    'not available at this time',
    'currently unavailable',
    'capacity has been reached',
  ];

  const limitedPatterns = [
    'limited availability',
    'space is limited',
    'limited spots',
    'limited openings',
    'availability varies',
    'seasonal',
    'summer program',
    'selected applicants',
    'competitive application',
  ];

  const availablePatterns = [
    'apply now',
    'volunteer application',
    'apply today',
    'applications open',
    'accepting applications',
    'volunteer opportunities',
    'volunteer',
  ];

  if (includesAny(text, waitlistPatterns)) {
    return { status: 'waitlist', summary: 'Page indicates waitlist availability.' };
  }

  if (includesAny(text, closedPatterns)) {
    return { status: 'closed', summary: 'Page indicates applications or registration are closed.' };
  }

  if (includesAny(text, unavailablePatterns)) {
    return {
      status: 'unavailable',
      summary: 'Page indicates volunteering or shadowing is not currently available.',
    };
  }

  if (includesAny(text, limitedPatterns)) {
    return {
      status: 'limited',
      summary: 'Page indicates limited, seasonal, selective, or variable availability.',
    };
  }

  if (includesAny(text, availablePatterns)) {
    return { status: 'available', summary: 'Page contains active volunteer or application language.' };
  }

  return { status: 'limited', summary: 'No clear availability language found; marked limited pending review.' };
}

function extractRequirementSummary(text) {
  const keywords = [
    'minimum age',
    'must be',
    'eligible',
    'eligibility',
    'application',
    'background check',
    'orientation',
    'training',
    'immunization',
    'vaccination',
    'tb test',
    'hipaa',
    'parent',
    'guardian',
    'high school',
    'college',
    'commitment',
    'hours',
  ];

  const sentences = text
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35 && sentence.length < 260);

  const matches = sentences.filter((sentence) =>
    keywords.some((keyword) => sentence.includes(keyword))
  );

  return matches.slice(0, 5).join('. ');
}

async function fetchPageText(url) {
  if (!url) {
    return { ok: false, status: null, text: '', note: 'No URL available' };
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'OpenvolBot/1.0 student healthcare volunteer verifier',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      },
    });

    const html = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      text: cleanText(html),
      note: `HTTP ${response.status}`,
    };
  } catch (error) {
    return { ok: false, status: null, text: '', note: error.message };
  }
}

async function checkClinic(clinic) {
  const urlToCheck = clinic.volunteer_url || clinic.website_url;

  if (!urlToCheck) {
    await supabase
      .from('clinics')
      .update({
        last_verified: new Date().toISOString(),
        check_status: 'skipped',
        check_notes: 'No volunteer or website URL available.',
        last_change_summary: 'No volunteer or website URL available for verification.',
      })
      .eq('id', clinic.id);

    console.log(`SKIPPED - ${clinic.clinic_name}: No URL`);
    return;
  }

  const page = await fetchPageText(urlToCheck);

  if (!page.ok || !page.text) {
    await supabase
      .from('clinics')
      .update({
        last_verified: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        check_status: 'failed',
        check_notes: page.note,
        last_change_summary: `Verification failed: ${page.note}`,
      })
      .eq('id', clinic.id);

    console.log(`FAILED - ${clinic.clinic_name}: ${page.note}`);
    return;
  }

  const newHash = hashText(page.text);
  const oldHash = clinic.source_hash || null;
  const hasPageChanged = oldHash && oldHash !== newHash;

  const availability = detectAvailability(page.text);
  const detectedDates = extractDates(page.text);
  const dateCheck = determineDateStatus(detectedDates);
  const requirementSummary = extractRequirementSummary(page.text);

  const finalAvailabilityStatus = dateCheck.availability_status || availability.status;
  const finalSummary = dateCheck.summary || availability.summary;

  const updates = {
    availability_status: finalAvailabilityStatus,
    source_hash: newHash,
    last_verified: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
    check_status: 'success',
    check_notes: page.note,
    date_status: dateCheck.date_status,
    last_change_summary: hasPageChanged
      ? `${finalSummary} Page content changed since last check.`
      : finalSummary,
  };

  // Do not overwrite requirements with scraped lowercase text.
// Keep manually entered requirements clean and readable.
// if (requirementSummary) {
//   updates.requirements = requirementSummary;
// }
  if (detectedDates.application_start_date) updates.application_start_date = detectedDates.application_start_date;

  if (detectedDates.application_end_date) {
    updates.application_end_date = detectedDates.application_end_date;
    updates.application_deadline = detectedDates.application_end_date;
  }

  if (detectedDates.program_start_date) updates.program_start_date = detectedDates.program_start_date;
  if (detectedDates.program_end_date) updates.program_end_date = detectedDates.program_end_date;
  if (hasPageChanged) updates.last_change_detected_at = new Date().toISOString();

  await supabase.from('clinics').update(updates).eq('id', clinic.id);

  console.log(
    `${hasPageChanged ? 'UPDATED' : 'CHECKED'} - ${clinic.clinic_name} -> ${finalAvailabilityStatus}`
  );
}

async function main() {
  console.log('================================');
  console.log('OPENVOL CLINIC CHECK STARTED');
  console.log(new Date().toISOString());
  console.log('SUPABASE URL:', SUPABASE_URL ? 'FOUND' : 'MISSING');
  console.log('SERVICE KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'MISSING');
  console.log('================================');

  const { data: clinics, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('active_status', true)
    .order('clinic_name');

  if (error) throw error;

  if (!clinics || clinics.length === 0) {
    console.log('No active clinics found.');
    return;
  }

  for (const clinic of clinics) {
    await checkClinic(clinic);
    await sleep(1500);
  }

  console.log(`Finished checking ${clinics.length} clinics.`);
}

main().catch((error) => {
  console.error('Clinic update failed:', error);
  process.exit(1);
});
