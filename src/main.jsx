import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, MapPin, ExternalLink, HeartPulse, Users, BarChart3, ShieldCheck, Globe2, Lock } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { supabase } from './lib/supabase';
import { trackPageView, trackClinicClick, trackSearch } from './lib/tracking';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function Header({ setRoute }) {
  return <header className="header">
    <div className="brand" onClick={() => setRoute('home')}><div className="logo"><HeartPulse size={24}/></div><span>Openvol</span></div>
    <nav><button onClick={() => setRoute('home')}>Clinics</button><button onClick={() => setRoute('admin')}>Admin</button></nav>
  </header>;
}

function Hero() {
  return <section className="hero">
    <div className="heroText">
      <span className="eyebrow"><Globe2 size={16}/> Student-led healthcare volunteering guide</span>
      <h1>Find clinic volunteering opportunities across Greater Atlanta.</h1>
      <p>Search community clinics, free clinics, and outreach organizations that welcome students and volunteers interested in healthcare service.</p>
      <div className="heroStats"><div><b>Atlanta</b><span>Metro area</span></div><div><b>Free</b><span>Student resource</span></div>
    </div>
    <div className="heroCard">
      <img src="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80" alt="Healthcare volunteers" />
      --<div className="floating"><ShieldCheck/> Privacy-first analytics</div>
    </div>
  </section>;
}

function ClinicCard({ clinic }) {
  const mapUrl = clinic.latitude && clinic.longitude ? `https://www.openstreetmap.org/?mlat=${clinic.latitude}&mlon=${clinic.longitude}#map=14/${clinic.latitude}/${clinic.longitude}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(clinic.address || clinic.clinic_name)}`;
  const click = async (url) => { await trackClinicClick(clinic.id, url); window.open(url, '_blank', 'noopener,noreferrer'); };
  return <article className="clinicCard">
    <img src={clinic.image_url || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80'} alt={clinic.clinic_name}/>
    <div className="cardBody">
      <div className="cardTop"><h3>{clinic.clinic_name}</h3><span>{clinic.minimum_age ? `${clinic.minimum_age}+` : 'Ask'}</span></div>
      <p className="location"><MapPin size={16}/>{clinic.city}, {clinic.county} County</p>
      <p>{clinic.notes}</p>
      <div className="tags"><span>{clinic.volunteer_type}</span></div>
      <div className="requirements"><b>Requirements:</b> {clinic.requirements || 'Contact clinic directly'}</div>
      <div className="actions">
        {clinic.volunteer_url && <button className="primary" onClick={() => click(clinic.volunteer_url)}>Volunteer Link <ExternalLink size={15}/></button>}
        {clinic.website_url && <button onClick={() => click(clinic.website_url)}>Website</button>}
        <button onClick={() => window.open(mapUrl, '_blank', 'noopener,noreferrer')}>Map</button>
      </div>
    </div>
  </article>;
}

function Home() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ searchText: '', city: '', county: '', minimumAge: '' });

  useEffect(() => { trackPageView('/'); loadClinics(); }, []);
  async function loadClinics() {
    const { data } = await supabase.from('clinics').select('*').eq('active_status', true).order('clinic_name');
    setClinics(data || []); setLoading(false);
  }
  const cities = [...new Set(clinics.map(c => c.city).filter(Boolean))];
  const counties = [...new Set(clinics.map(c => c.county).filter(Boolean))];
  const filtered = useMemo(() => clinics.filter(c => {
    const s = filters.searchText.toLowerCase();
    const matchesText = !s || [c.clinic_name,c.city,c.county,c.volunteer_type,c.notes].join(' ').toLowerCase().includes(s);
    const matchesCity = !filters.city || c.city === filters.city;
    const matchesCounty = !filters.county || c.county === filters.county;
    const matchesAge = !filters.minimumAge || !c.minimum_age || Number(filters.minimumAge) >= c.minimum_age;
    return matchesText && matchesCity && matchesCounty && matchesAge;
  }), [clinics, filters]);

  const onSearch = () => trackSearch(filters);
  return <main><Hero />
    <section className="searchPanel">
      <div className="searchBox"><Search size={20}/><input placeholder="Search clinic name, city, or volunteer type" value={filters.searchText} onChange={e=>setFilters({...filters, searchText:e.target.value})} onBlur={onSearch}/></div>
      <select value={filters.city} onChange={e=>setFilters({...filters, city:e.target.value})} onBlur={onSearch}><option value="">All cities</option>{cities.map(x=><option key={x}>{x}</option>)}</select>
      <select value={filters.county} onChange={e=>setFilters({...filters, county:e.target.value})} onBlur={onSearch}><option value="">All counties</option>{counties.map(x=><option key={x}>{x}</option>)}</select>
      <input type="number" placeholder="Student age" value={filters.minimumAge} onChange={e=>setFilters({...filters, minimumAge:e.target.value})} onBlur={onSearch}/>
    </section>
    <section className="sectionTitle"><h2>Clinic opportunities</h2><p>{filtered.length} matching clinics</p></section>
    {loading ? <p className="loading">Loading clinics...</p> : <section className="grid">{filtered.map(c => <ClinicCard key={c.id} clinic={c}/>)}</section>}
    <section className="impact"><div><Users/><h3>Why this matters</h3><p>This student-led project makes healthcare volunteering easier to discover while helping the site owner understand which clinics and regions receive the most interest.</p></div><div><BarChart3/><h3>Built-in metrics</h3><p>Anonymous tracking captures unique visits, page views, search activity, and outbound clinic clicks without collecting student personal information.</p></div></section>
  </main>;
}

function Admin() {
  const [pass, setPass] = useState('');
  const [ok, setOk] = useState(sessionStorage.getItem('admin_ok') === '1');
  const [metrics, setMetrics] = useState(null);
  const adminPass = import.meta.env.VITE_ADMIN_PASSCODE || 'admin';
  useEffect(() => { if (ok) loadMetrics(); }, [ok]);
  function login(){ 
  if(pass.trim() === adminPass.trim()){ 
    sessionStorage.setItem('admin_ok','1'); 
    setOk(true); 
  } else {
    alert("Incorrect passcode. Please try again.");
  }
}
  async function loadMetrics(){
    const [{data:visitors},{data:views},{data:clicks},{data:clinics},{data:searches}] = await Promise.all([
      supabase.from('visitors').select('*'), supabase.from('page_views').select('*'), supabase.from('clinic_link_clicks').select('*, clinics(clinic_name, city)'), supabase.from('clinics').select('*'), supabase.from('search_events').select('*')
    ]);
    setMetrics({visitors: visitors||[], views: views||[], clicks: clicks||[], clinics: clinics||[], searches: searches||[]});
  }
  if(!ok) return <main className="adminLogin"><div><Lock/><h1>Admin Metrics</h1><p>Enter the owner passcode to view anonymous project metrics.</p><input type="password" placeholder="Passcode" value={pass} onChange={e=>setPass(e.target.value)} /><button className="primary" onClick={login}>Open Dashboard</button></div></main>;
  if(!metrics) return <p className="loading">Loading metrics...</p>;
  const clicksByClinic = metrics.clicks.reduce((a,c)=>{const n=c.clinics?.clinic_name||'Unknown'; a[n]=(a[n]||0)+1; return a;},{});
  const topLabels = Object.keys(clicksByClinic).slice(0,8);
  const barData = { labels: topLabels, datasets:[{ label:'Clicks', data: topLabels.map(l=>clicksByClinic[l]) }] };
  const deviceCounts = metrics.clicks.reduce((a,c)=>{const n=c.device_type||'Unknown'; a[n]=(a[n]||0)+1; return a;},{});
  const donutData = { labels:Object.keys(deviceCounts), datasets:[{ data:Object.values(deviceCounts) }] };
  return <main className="admin"><section className="sectionTitle"><h1>Admin Dashboard</h1><p>Anonymous engagement metrics</p></section>
    <section className="metricGrid"><div><b>{metrics.visitors.length}</b><span>Unique Visitors</span></div><div><b>{metrics.views.length}</b><span>Page Views</span></div><div><b>{metrics.clicks.length}</b><span>Clinic Link Clicks</span></div><div><b>{metrics.searches.length}</b><span>Search Events</span></div></section>
    <section className="charts"><div className="chartCard"><h3>Clicks by Clinic</h3><Bar data={barData}/></div><div className="chartCard"><h3>Clicks by Device</h3><Doughnut data={donutData}/></div></section>
    <section className="tableCard"><h3>Recent Clinic Clicks</h3><table><thead><tr><th>Clinic</th><th>City</th><th>Device</th><th>Browser</th><th>Clicked At</th></tr></thead><tbody>{metrics.clicks.slice(-15).reverse().map(c=><tr key={c.id}><td>{c.clinics?.clinic_name}</td><td>{c.clinics?.city}</td><td>{c.device_type}</td><td>{c.browser}</td><td>{new Date(c.clicked_at).toLocaleString()}</td></tr>)}</tbody></table></section>
  </main>;
}

function App(){
  const [route,setRoute] = useState(location.pathname.startsWith('/admin') ? 'admin' : 'home');
  useEffect(()=>{ history.replaceState(null,'', route==='admin'?'/admin':'/'); },[route]);
  return <><Header setRoute={setRoute}/>{route==='admin'?<Admin/>:<Home/>}<footer>© {new Date().getFullYear()} Openvol. Student-led public service project.</footer></>;
}

createRoot(document.getElementById('root')).render(<App/>);
