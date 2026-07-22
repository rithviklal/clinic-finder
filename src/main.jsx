import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search, MapPin, Bookmark, ExternalLink, Menu, X, HeartPulse,
  Stethoscope, Microscope, Sprout, Route, Clock3, ChevronRight,
  GraduationCap, Hospital, Compass, SlidersHorizontal,
  Sparkles, ShieldCheck
} from 'lucide-react';
import MapLibreOpportunityMap from './OpportunityMapMapLibre';
import MapWorkspace from './MapWorkspace';
import { parseSearchIntent, scoreOpportunity } from './searchIntent';
import { supabase } from './lib/supabase';
import { trackPageView, trackClinicClick, trackOpportunityClick, trackSearch } from './lib/tracking';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import './styles.css';
import './build71.css';

const ROUTES = [
  ['home', 'Home'],
  ['clinical', 'Clinical Volunteering'],
  ['rural', 'Rural Health'],
  ['shadowing', 'Shadowing'],
  ['research', 'Research'],
  ['journey', 'My Journey'],
  ['saved', 'Saved']
];

const RURAL_COUNTIES = new Set([
  'Appling','Atkinson','Bacon','Baker','Ben Hill','Berrien','Bleckley','Brantley','Brooks','Bryan','Bulloch','Burke','Calhoun','Camden','Candler','Charlton','Chattooga','Clay','Clinch','Coffee','Colquitt','Cook','Crisp','Dade','Decatur','Dodge','Dooly','Early','Echols','Effingham','Elbert','Emanuel','Evans','Fannin','Franklin','Gilmer','Glascock','Grady','Greene','Habersham','Hancock','Haralson','Hart','Heard','Irwin','Jeff Davis','Jefferson','Jenkins','Johnson','Lanier','Laurens','Liberty','Lincoln','Long','Lumpkin','Macon','Marion','McDuffie','McIntosh','Miller','Mitchell','Montgomery','Morgan','Murray','Pierce','Polk','Pulaski','Putnam','Quitman','Rabun','Randolph','Schley','Screven','Seminole','Stephens','Stewart','Sumter','Talbot','Taliaferro','Tattnall','Taylor','Telfair','Terrell','Thomas','Tift','Toombs','Towns','Treutlen','Turner','Union','Ware','Warren','Washington','Wayne','Webster','Wheeler','White','Wilcox','Wilkes','Worth'
]);

function isRural(item) {
  const text = `${item.county || ''} ${item.city || ''} ${item.notes || ''} ${item.volunteer_type || ''} ${item.opportunity_category || ''}`.toLowerCase();
  return RURAL_COUNTIES.has(String(item.county || '').replace(/ County$/i, ''))
    || /rural|critical access|mobile clinic|community health center/.test(text);
}

function categoryOf(item) {
  const text = `${item.opportunity_category || ''} ${item.opportunity_type || ''} ${item.notes || ''}`.toLowerCase();
  if (/research|laboratory|lab/.test(text)) return 'research';
  if (/shadow/.test(text)) return 'shadowing';
  return isRural(item) ? 'rural' : 'clinic';
}

function initials(name = 'Openvol') {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map(value => value[0]).join('').toUpperCase();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map(value => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function getStudent(email) {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    alert('Enter your email to save this opportunity.');
    return null;
  }

  const { data: existing } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('email', clean)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('student_profiles')
    .insert({ email: clean })
    .select()
    .single();

  if (error) {
    alert('Unable to create your profile.');
    return null;
  }

  return data;
}

function AppHeader({ route, navigate }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="top-strip">
        <span>Powered by The World Savers</span>
        <span>Student-led • Free to use • Built for impact</span>
      </div>

      <header className="site-header">
        <button className="brand-button" onClick={() => navigate('home')}>
          <img src="/openvol-logo.png" alt="Openvol" />
          <span>
            <b>Openvol</b>
            <small>Your healthcare journey</small>
          </span>
        </button>

        <nav className={open ? 'open' : ''}>
          {ROUTES.map(([key, label]) => (
            <button
              key={key}
              className={route === key ? 'active' : ''}
              onClick={() => {
                navigate(key);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
    </>
  );
}

function SearchBar({ value, onChange, placeholder = 'Search clinics, hospitals, programs, or cities' }) {
  return (
    <div className="search-shell">
      <Search size={20} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search opportunities"
      />
      <button type="button" aria-label="Search filters">
        <SlidersHorizontal size={18} />
        <span>Smart search</span>
      </button>
    </div>
  );
}

function Stat({ value, label, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Home({ data, navigate }) {
  const all = useMemo(() => [...data.clinics, ...data.opportunities], [data]);
  const rural = useMemo(() => all.filter(isRural), [all]);

  return (
    <main className="phase-two-home">
      <section className="phase-two-hero">
        <div className="hero-intro">
          <span className="eyebrow"><Sparkles size={15} /> Built for future healthcare professionals</span>
          <h1>Find the experience that moves your healthcare journey forward.</h1>
          <p>Explore verified clinical, rural health, shadowing, and research opportunities across Georgia—all in one beautifully simple platform.</p>
          <div className="hero-proof">
            <span><ShieldCheck size={17} /> Free for students</span>
            <span><MapPin size={17} /> Georgia-wide</span>
            <span><HeartPulse size={17} /> Healthcare focused</span>
          </div>
        </div>

        <MapWorkspace items={all} categoryOf={categoryOf} navigate={navigate} />
      </section>

      <section className="stats-grid phase-two-stats">
        <Stat value={data.clinics.length} label="Clinical organizations" icon={<Hospital />} />
        <Stat value={rural.length} label="Rural health listings" icon={<Sprout />} />
        <Stat value={data.opportunities.filter(item => categoryOf(item) === 'shadowing').length} label="Shadowing programs" icon={<Stethoscope />} />
        <Stat value={data.opportunities.filter(item => categoryOf(item) === 'research').length} label="Research opportunities" icon={<Microscope />} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>Choose your pathway</span>
          <h2>Explore healthcare experiences built around your goals.</h2>
        </div>
        <div className="pathway-grid">
          <Pathway icon={<HeartPulse />} title="Clinical Volunteering" text="Serve patients and communities through hospitals, clinics, and outreach programs." onClick={() => navigate('clinical')} />
          <Pathway featured icon={<Sprout />} title="Rural Health" text="Make an impact where healthcare access and every volunteer matter most." onClick={() => navigate('rural')} />
          <Pathway icon={<Stethoscope />} title="Shadowing" text="Explore specialties and learn directly from healthcare professionals." onClick={() => navigate('shadowing')} />
          <Pathway icon={<Microscope />} title="Research" text="Build scientific skills through university, hospital, and lab experiences." onClick={() => navigate('research')} />
        </div>
      </section>

      <section className="impact-banner">
        <div>
          <span>Openvol Rural Health</span>
          <h2>Serve beyond the city limits.</h2>
          <p>Find rural clinics, critical access hospitals, mobile care programs, and community health organizations across Georgia.</p>
        </div>
        <button onClick={() => navigate('rural')}>Visit Rural Health <Route size={18} /></button>
      </section>
    </main>
  );
}

function Pathway({ icon, title, text, onClick, featured }) {
  return (
    <button className={`pathway-card ${featured ? 'featured' : ''}`} onClick={onClick}>
      <div className="pathway-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <span>Explore pathway <ChevronRight size={17} /></span>
    </button>
  );
}

function ListingCard({ item, studentEmail, onHover, bestMatch = false }) {
  const cat = categoryOf(item);
  const score = Math.max(0, Math.min(100, Math.round(Number(item.matchScore) || 0)));
  const reasons = Array.isArray(item.matchReasons) ? item.matchReasons : [];
  const badges = [item.specialty, item.opportunity_type || item.opportunity_category].filter(Boolean);

  async function save() {
    const student = await getStudent(studentEmail);
    if (!student) return;
    const table = item.kind === 'clinic' ? 'saved_clinics' : 'saved_opportunities';
    const payload = item.kind === 'clinic'
      ? { student_id: student.id, clinic_id: item.id, application_status: 'Interested' }
      : { student_id: student.id, opportunity_id: item.id, application_status: 'Interested' };
    const { error } = await supabase.from(table).insert(payload);
    alert(error ? (error.message?.toLowerCase().includes('duplicate') ? 'Already saved.' : 'Unable to save right now.') : 'Saved to My Journey.');
  }

  async function openUrl() {
    if (!item.url) return;
    if (item.kind === 'clinic') await trackClinicClick(item.id, item.url);
    else await trackOpportunityClick(item.id, item.url);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <article className={`listing-card ${bestMatch ? 'best-match' : ''}`} onMouseEnter={() => onHover?.(`${item.kind}-${item.id}`)} onMouseLeave={() => onHover?.(null)}>
      <div className={`listing-logo ${cat}`}>{initials(item.organization)}</div>
      <div className="listing-main">
        <div className="listing-top">
          <div>
            <span className={`category-pill ${cat}`}>{cat === 'clinic' ? 'Clinical' : cat === 'rural' ? 'Rural Health' : cat[0].toUpperCase() + cat.slice(1)}</span>
            <div className="listing-title-row">
              <div>
                <h3>{item.title}</h3>
                <p className="org-name">{item.organization}</p>
              </div>
              {score > 0 && <div className="listing-match-score" aria-label={`${score}% match`}><b>{score}%</b><span>match</span></div>}
            </div>
          </div>
          <button className="icon-button" onClick={save} aria-label={`Save ${item.title}`}><Bookmark size={18} /></button>
        </div>

        <div className="meta-row">
          <span><MapPin size={15} />{item.city || 'Georgia'}{item.county ? `, ${String(item.county).replace(/ County$/i, '')} County` : ''}</span>
          <span><Clock3 size={15} />{item.minimum_age ? `${item.minimum_age}+` : 'Contact for age'}</span>
          {Number.isFinite(Number(item.distanceMiles)) && <span className="listing-distance">{Number(item.distanceMiles).toFixed(1)} miles away</span>}
        </div>

        {badges.length > 0 && <div className="listing-badges" aria-label="Opportunity details">{badges.map(value => <span key={value}>{value}</span>)}</div>}

        <p className="description">{item.notes || item.requirements || 'Contact the organization for current program details and availability.'}</p>

        {reasons.length > 0 && <div className="listing-match-reasons"><b>Why this matched</b><ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}

        <div className="listing-actions">
          <button onClick={save}>Save</button>
          {item.url && <button className="primary-btn small" onClick={openUrl}>View opportunity <ExternalLink size={15} /></button>}
        </div>
      </div>
    </article>
  );
}

function DirectoryPage({ data, mode, studentEmail, setStudentEmail }) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState(null);

  const base = useMemo(() => {
    if (mode === 'clinical') return data.clinics;
    if (mode === 'rural') return [...data.clinics, ...data.opportunities].filter(isRural);
    return data.opportunities.filter(item => categoryOf(item) === mode);
  }, [data.clinics, data.opportunities, mode]);

  const cities = useMemo(() => uniqueSorted(base.map(item => item.city)), [base]);
  const counties = useMemo(() => uniqueSorted(base.map(item => String(item.county || '').replace(/ County$/i, ''))), [base]);

  const items = useMemo(() => {
    const cleanQuery = query.trim();
    const intent = parseSearchIntent(cleanQuery, cities, counties);
    const filters = {
      category: intent.category || mode,
      specialty: intent.specialty,
      city: intent.city,
      county: intent.county,
      distance: intent.distance
    };

    return base
      .map(item => scoreOpportunity(item, filters, categoryOf, null, cleanQuery))
      .filter(item => {
        if (!cleanQuery) return true;
        const searchable = [item.title, item.organization, item.city, item.county, item.notes, item.requirements, item.specialty, item.opportunity_type, item.opportunity_category].filter(Boolean).join(' ').toLowerCase();
        const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        const hasTextMatch = queryWords.some(word => searchable.includes(word));
        const intentMatch = Boolean(
          (intent.specialty && item.matchReasons.includes(intent.specialty))
          || (intent.city && item.matchReasons.includes(intent.city))
          || (intent.county && item.matchReasons.some(reason => reason.toLowerCase().includes(intent.county.toLowerCase())))
          || (intent.category && categoryOf(item) === intent.category)
        );
        return hasTextMatch || intentMatch || item.matchScore > 0;
      })
      .sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : String(a.title || '').localeCompare(String(b.title || '')));
  }, [base, cities, counties, mode, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim()) trackSearch({ searchText: query.trim(), category: mode }).catch(() => {});
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query, mode]);

  useEffect(() => {
    setSelected(null);
    setActiveId(null);
  }, [query, mode]);

  const title = mode === 'clinical' ? 'Clinical Volunteering' : mode === 'rural' ? 'Rural Health' : mode === 'shadowing' ? 'Shadowing' : 'Research';
  const subtitle = mode === 'rural' ? 'Explore meaningful service opportunities in Georgia communities where healthcare access matters most.' : 'Find verified healthcare experiences across Georgia.';
  const hasRankedSearch = Boolean(query.trim() && items.some(item => item.matchScore > 0));

  return (
    <main className="directory-page">
      <section className={`directory-hero ${mode === 'rural' ? 'rural-hero' : ''}`}>
        <div><span className="eyebrow">{mode === 'rural' ? 'Openvol flagship pathway' : 'Explore Georgia'}</span><h1>{title}</h1><p>{subtitle}</p></div>
        <SearchBar value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()} by specialty, city, county, or keyword`} />
      </section>

      {mode === 'rural' && <section className="rural-summary">
        <Stat value={items.length} label="Rural opportunities" icon={<Sprout />} />
        <Stat value={new Set(items.map(item => item.county).filter(Boolean)).size} label="Counties represented" icon={<MapPin />} />
        <Stat value={items.filter(item => /clinic|hospital/i.test(`${item.organization} ${item.title}`)).length} label="Clinics & hospitals" icon={<Hospital />} />
        <Stat value="Georgia" label="Statewide focus" icon={<Compass />} />
      </section>}

      <section className="split-layout">
        <div className="results-pane">
          <div className="results-toolbar">
            <div><b>{items.length} opportunities</b><span>{hasRankedSearch ? 'Ranked by relevance to your search' : 'Updated from the Openvol directory'}</span></div>
            <label className="email-inline">Save with <input type="email" value={studentEmail} onChange={event => setStudentEmail(event.target.value)} placeholder="your email" /></label>
          </div>

          <div className="listing-stack">
            {items.length > 0 ? items.map((item, index) => (
              <ListingCard key={`${item.kind}-${item.id}`} item={item} studentEmail={studentEmail} onHover={setActiveId} bestMatch={hasRankedSearch && index === 0 && item.matchScore > 0} />
            )) : <div className="empty-results"><Search size={28} /><h3>No opportunities found</h3><p>Try a broader city, county, specialty, or keyword. You can also clear the search to view every opportunity in this pathway.</p></div>}
          </div>
        </div>

        <div className="sticky-map">
          <MapLibreOpportunityMap items={items} activeId={activeId} onSelect={setSelected} ruralMode={mode === 'rural'} />
          {selected && <div className="map-selection"><span>{categoryOf(selected) === 'rural' ? 'Rural Health' : 'Opportunity'}</span><b>{selected.title}</b><small>{selected.city}{selected.county ? `, ${String(selected.county).replace(/ County$/i, '')} County` : ''}</small></div>}
        </div>
      </section>
    </main>
  );
}

function JourneyPage({ studentEmail, setStudentEmail, savedOnly = false }) {
  return <main className="simple-page"><section className="simple-hero"><span className="eyebrow">Personal workspace</span><h1>{savedOnly ? 'Saved Opportunities' : 'My Journey'}</h1><p>{savedOnly ? 'Keep your favorite healthcare experiences in one place.' : 'Track the experiences, hours, applications, and milestones shaping your path into healthcare.'}</p></section><section className="journey-card"><GraduationCap size={34} /><h2>Connect your journey</h2><p>Enter the email you use when saving opportunities.</p><input type="email" value={studentEmail} onChange={event => setStudentEmail(event.target.value)} placeholder="student@example.com" /><button className="primary-btn">Load my journey</button><small>Your information is used only to save and organize your Openvol activity.</small></section></main>;
}

function App() {
  const path = location.pathname.split('/')[1];
  const [route, setRoute] = useState(ROUTES.some(([key]) => key === path) ? path : 'home');
  const [data, setData] = useState({ clinics: [], opportunities: [], loading: true, error: '' });
  const [studentEmail, setStudentEmail] = useState(localStorage.getItem('openvol_student_email') || '');

  function navigate(next) {
    setRoute(next);
    history.pushState(null, '', next === 'home' ? '/' : `/${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => { localStorage.setItem('openvol_student_email', studentEmail); }, [studentEmail]);
  useEffect(() => { const pop = () => setRoute(location.pathname.split('/')[1] || 'home'); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  useEffect(() => { trackPageView(route).catch(() => {}); }, [route]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [clinicResult, opportunityResult] = await Promise.all([
        supabase.from('clinics').select('*').order('clinic_name'),
        supabase.from('opportunities').select('*').order('opportunity_name')
      ]);
      if (cancelled) return;
      const error = clinicResult.error || opportunityResult.error;
      setData({
        loading: false,
        error: error?.message || '',
        clinics: (clinicResult.data || []).map(item => ({ ...item, kind: 'clinic', title: item.clinic_name, organization: item.clinic_name, url: item.volunteer_url || item.website_url })),
        opportunities: (opportunityResult.data || []).map(item => ({ ...item, kind: 'opportunity', title: item.opportunity_name, organization: item.organization_name, url: item.application_url || item.opportunity_url || item.website_url }))
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return <>
    <AppHeader route={route} navigate={navigate} />
    {data.loading ? <div className="loading-screen"><div className="loader" /><p>Loading Openvol opportunities…</p></div>
      : data.error ? <main className="simple-page"><section className="journey-card"><HeartPulse size={34} /><h2>Openvol could not load the directory</h2><p>{data.error}</p><button className="primary-btn" onClick={() => location.reload()}>Try again</button></section></main>
      : route === 'home' ? <Home data={data} navigate={navigate} />
      : ['clinical','rural','shadowing','research'].includes(route) ? <DirectoryPage data={data} mode={route} studentEmail={studentEmail} setStudentEmail={setStudentEmail} />
      : route === 'saved' ? <JourneyPage savedOnly studentEmail={studentEmail} setStudentEmail={setStudentEmail} />
      : <JourneyPage studentEmail={studentEmail} setStudentEmail={setStudentEmail} />}

    <footer>
      <div><img src="/openvol-logo.png" alt="Openvol" /><p>Your Journey into Healthcare Starts Here.</p></div>
      <div><b>Explore</b><button onClick={() => navigate('clinical')}>Clinical Volunteering</button><button onClick={() => navigate('rural')}>Rural Health</button><button onClick={() => navigate('shadowing')}>Shadowing</button><button onClick={() => navigate('research')}>Research</button></div>
      <div><b>Openvol</b><span>Created by Rithvik Lal</span><span>A student-led initiative</span><span>Build 71 RC1</span><span>© {new Date().getFullYear()} Openvol</span></div>
    </footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
