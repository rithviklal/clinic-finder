import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WAIT_MS_BETWEEN_REQUESTS = 1500;

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

function detectAvailability(text, category) {
  const closedPatterns = [
    'applications are closed',
    'application is closed',
    'application period is closed',
    'applications closed',
    'program is closed',
    'program closed',
    'registration closed',
    'no longer accepting applications',
    'not accepting applications',
    'not currently accepting applications',
    'we are not accepting applications',
    'deadline has passed',
    'past deadline',
  ];

  const unavailablePatterns = [
    'not accepting volunteers',
    'currently not accepting volunteers',
    'not currently accepting volunteers',
    'volunteer opportunities are not available',
    'volunteering is not available',
    'no volunteer opportunities',
    'shadowing is not available',
    'no shadowing opportunities',
    'we do not offer shadowing',
    'shadowing unavailable',
    'research opportunities are not available',
    'no research opportunities',
    'currently unavailable',
    'not available at this time',
    'capacity has been reached',
    'full at this time',
  ];

  const waitlistPatterns = [
    'waitlist only',
    'join the waitlist',
    'waiting list',
    'wait list',
    'waitlisted',
  ];

  const limitedPatterns = [
    'limited availability',
    'space is limited',
    'limited spots',
    'limited number of spots',
    'limited openings',
    'limited opportunities',
    'selected applicants',
    'competitive application',
    'availability varies',
    'program availability varies',
    'department availability varies',
    'seasonal',
    'summer program',
    'summer internship',
  ];

  const availablePatterns = [
    'apply now',
    'volunteer application',
    'apply today',
    'applications open',
    'now accepting applications',
    'accepting applications',
    'volunteer opportunities',
    'shadowing',
    'observation',
    'research program',
    'internship',
  ];

  if (includesAny(text, waitlistPatterns)) {
    return {
      status: 'waitlist',
      summary: 'Page indicates waitlist or waiting-list availability.',
    };
  }

  if (includesAny(text, closedPatterns)) {
    return {
      status: 'closed',
      summary: 'Page indicates applications or registration are closed.',
    };
  }

  if (includesAny(text, unavailablePatterns)) {
    return {
      status: 'unavailable',
      summary: 'Page indicates the opportunity is not currently available.',
    };
  }

  if (includesAny(text, limitedPatterns)) {
    return {
      status: 'limited',
      summary: 'Page indicates limited, seasonal, selective, or variable availability.',
    };
  }

  if (includesAny(text, availablePatterns)) {
    return {
      status: 'available',
      summary: 'Page contains active application, volunteer, shadowing, or research language.',
    };
  }

  return {
    status: 'limited',
    summary: `No clear availability language found for ${category || 'opportunity'}; marked limited pending review.`,
  };
}

function extractDeadline(text) {
  const patterns = [
    /deadline\s*(is|:)?\s*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /applications?\s+due\s*(by|:)?\s*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /apply\s+by\s*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /deadline\s*(is|:)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /applications?\s+due\s*(by|:)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /apply\s+by\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[match.length - 1];
    }
  }

  return null;
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
    'college student',
    'undergraduate',
    'shadowing',
    'observation',
    'research',
    'internship',
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
    return {
      ok: false,
      status: null,
      text: '',
      note: 'No URL available',
    };
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'OpenvolBot/1.0 (+https://theworldsavers.org) student healthcare opportunity verifier',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
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
    return {
      ok: false,
      status: null,
      text: '',
      note: error.message,
    };
  }
}

async function updateOpportunity(opportunity) {
  const urlToCheck = opportunity.application_url || opportunity.website_url;

  if (!urlToCheck) {
    await supabase
      .from('opportunities')
      .update({
        last_verified: new Date().toISOString(),
        availability_status: opportunity.availability_status || 'limited',
        last_change_summary: 'No application or website URL available for verification.',
      })
      .eq('id', opportunity.id);

    console.log(`SKIPPED - ${opportunity.organization_name}: No URL`);
    return;
  }

  const page = await fetchPageText(urlToCheck);

  if (!page.ok || !page.text) {
    await supabase
      .from('opportunities')
      .update({
        last_verified: new Date().toISOString(),
        availability_status: opportunity.availability_status || 'limited',
        last_change_summary: `Verification failed: ${page.note}`,
      })
      .eq('id', opportunity.id);

    console.log(`FAILED - ${opportunity.organization_name}: ${page.note}`);
    return;
  }

  const newHash = hashText(page.text);
  const oldHash = opportunity.source_hash || null;
  const hasPageChanged = oldHash && oldHash !== newHash;

  const availability = detectAvailability(page.text, opportunity.opportunity_category);
  const deadline = extractDeadline(page.text);
  const requirementSummary = extractRequirementSummary(page.text);

  const updates = {
    availability_status: availability.status,
    last_verified: new Date().toISOString(),
    source_hash: newHash,
    last_change_summary: availability.summary,
  };

  if (deadline) {
    updates.application_deadline = deadline;
  }

  if (requirementSummary) {
    updates.requirements = requirementSummary;
  }

  if (hasPageChanged) {
    updates.last_change_summary = `${availability.summary} Page content changed since last check.`;
  }

  await supabase.from('opportunities').update(updates).eq('id', opportunity.id);

  console.log(
    `${hasPageChanged ? 'UPDATED' : 'CHECKED'} - ${opportunity.organization_name} / ${
      opportunity.opportunity_name
    } -> ${availability.status}`
  );
}

async function main() {
  console.log('Starting Openvol opportunity verification...');

  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('active_status', true)
    .order('organization_name');

  if (error) {
    throw error;
  }

  if (!opportunities || opportunities.length === 0) {
    console.log('No active opportunities found.');
    return;
  }

  for (const opportunity of opportunities) {
    await updateOpportunity(opportunity);
    await sleep(WAIT_MS_BETWEEN_REQUESTS);
  }

  console.log(`Finished checking ${opportunities.length} opportunities.`);
}

main().catch((error) => {
  console.error('Opportunity update failed:', error);
  process.exit(1);
});