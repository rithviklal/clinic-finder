import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search,
  MapPin,
  ExternalLink,
  HeartPulse,
  Users,
  BarChart3,
  Globe2,
  Lock,
} from 'lucide-react';

import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

import { supabase } from './lib/supabase';
import { trackPageView, trackClinicClick, trackSearch } from './lib/tracking';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function Header({ setRoute }) {
  return (
    <header className="header">
      <div className="brand" onClick={() => setRoute('home')}>
        <img
          src="/openvol-logo.png"
          alt="Openvol"
          className="siteLogo"
        />
      </div>

      <nav>
        <button onClick={() => setRoute('home')}>
          Clinics
        </button>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="heroText">
        <span className="eyebrow">
          <Globe2 size={16} />
          Student-led healthcare volunteering guide
        </span>

        <h1>Find clinic volunteering opportunities across Greater Atlanta.</h1>

        <p>
          Search community clinics, free clinics, and outreach organizations that welcome
          students and volunteers interested in healthcare service.
        </p>

        <div className="heroStats">
          <div>
            <b>Atlanta</b>
            <span>Metro Area</span>
          </div>

          <div>
            <b>Free</b>
            <span>Student Resource</span>
          </div>
        </div>
      </div>

      <div className="heroCard">
        <img
          src="https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80"
          alt="Healthcare volunteers"
        />
      </div>
    </section>
  );
}

function ClinicCard({ clinic }) {
  const mapUrl =
    clinic.latitude && clinic.longitude
      ? `https://www.openstreetmap.org/?mlat=${clinic.latitude}&mlon=${clinic.longitude}#map=14/${clinic.latitude}/${clinic.longitude}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(
          clinic.address || clinic.clinic_name
        )}`;

  const handleClick = async (url) => {
    await trackClinicClick(clinic.id, url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="clinicCard">
      <div className="clinicLogoBox">
        <div className="clinicInitials">
          {clinic.clinic_name
            .split(' ')
            .filter(Boolean)
            .slice(0, 3)
            .map((word) => word[0])
            .join('')
            .toUpperCase()}
        </div>

        <div className="clinicLogoName">{clinic.clinic_name}</div>
      </div>

      <div className="cardBody">
        <div className="cardTop">
          <span className="ageBadge">{clinic.minimum_age ? `${clinic.minimum_age}+` : 'Ask'}</span>
        </div>

        <p className="location">
          <MapPin size={16} />
          {clinic.city}, {clinic.county} County
        </p>

        {clinic.address && <p className="address">{clinic.address}</p>}

        <p>{clinic.notes}</p>

        <div className="tags">
          {clinic.volunteer_type
            ? clinic.volunteer_type.split(',').map((tag) => (
                <span key={tag.trim()}>
                  {tag.trim()}
                </span>
              ))
            : <span>Volunteer Opportunity</span>}
        </div>

        <div className="requirements">
          <b>Requirements:</b> {clinic.requirements || 'Contact clinic directly'}
        </div>

        <div className="actions">
          {clinic.volunteer_url && (
            <button className="primary" onClick={() => handleClick(clinic.volunteer_url)}>
              Volunteer Link <ExternalLink size={15} />
            </button>
          )}

          {clinic.website_url && (
            <button onClick={() => handleClick(clinic.website_url)}>Website</button>
          )}

          <button onClick={() => window.open(mapUrl, '_blank', 'noopener,noreferrer')}>
            Map
          </button>
        </div>
      </div>
    </article>
  );
}

function Home() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchText: '',
    city: '',
    county: '',
    minimumAge: '',
  });

  useEffect(() => {
    trackPageView('/');
    loadClinics();
  }, []);

  async function loadClinics() {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('active_status', true)
      .order('clinic_name');

    if (error) {
      console.error('Error loading clinics:', error);
    }

    setClinics(data || []);
    setLoading(false);
  }

  const cities = [...new Set(clinics.map((clinic) => clinic.city).filter(Boolean))];
  const counties = [...new Set(clinics.map((clinic) => clinic.county).filter(Boolean))];

  const highSchoolFriendlyCount = clinics.filter(
    (clinic) => !clinic.minimum_age || clinic.minimum_age <= 16
  ).length;

  const filteredClinics = useMemo(() => {
    return clinics.filter((clinic) => {
      const searchText = filters.searchText.toLowerCase();

      const searchableText = [
        clinic.clinic_name,
        clinic.city,
        clinic.county,
        clinic.volunteer_type,
        clinic.notes,
        clinic.address,
      ]
        .join(' ')
        .toLowerCase();

      const matchesText = !searchText || searchableText.includes(searchText);
      const matchesCity = !filters.city || clinic.city === filters.city;
      const matchesCounty = !filters.county || clinic.county === filters.county;

      const matchesAge =
        !filters.minimumAge ||
        !clinic.minimum_age ||
        Number(filters.minimumAge) >= clinic.minimum_age;

      return matchesText && matchesCity && matchesCounty && matchesAge;
    });
  }, [clinics, filters]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    trackSearch(filters);
  };

  return (
    <main>
      <Hero />

      <section className="searchPanel">
        <div className="searchBox">
          <Search size={20} />
          <input
            placeholder="Search clinic name, city, or volunteer type"
            value={filters.searchText}
            onChange={(event) => updateFilter('searchText', event.target.value)}
            onBlur={handleSearch}
          />
        </div>

        <select
          value={filters.city}
          onChange={(event) => updateFilter('city', event.target.value)}
          onBlur={handleSearch}
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>

        <select
          value={filters.county}
          onChange={(event) => updateFilter('county', event.target.value)}
          onBlur={handleSearch}
        >
          <option value="">All counties</option>
          {counties.map((county) => (
            <option key={county}>{county}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Your age"
          value={filters.minimumAge}
          onChange={(event) => updateFilter('minimumAge', event.target.value)}
          onBlur={handleSearch}
        />
      </section>

      <section className="statsBanner">
        <div>{clinics.length} Clinics</div>
        <div>{counties.length} Counties</div>
        <div>{highSchoolFriendlyCount} High School Friendly</div>
      </section>

      <section className="sectionTitle">
        <h2>Clinic opportunities</h2>
        <p>{filteredClinics.length} matching clinics</p>
      </section>

      {loading ? (
        <p className="loading">Loading clinics...</p>
      ) : (
        <section className="grid">
          {filteredClinics.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </section>
      )}

      <div className="disclaimer">
        Volunteer requirements may change. Please verify age requirements, application procedures,
        and eligibility directly with each organization.
      </div>

      <section className="impact">
        <div>
          <Users />
          <h3>Why this matters</h3>
          <p>
            This student-led project makes healthcare volunteering easier to discover for students
            interested in clinical, community health, and service-based opportunities.
          </p>
        </div>

        <div>
          <BarChart3 />
          <h3>Project insights</h3>
          <p>
            Openvol helps identify which clinics, cities, and volunteer opportunities receive the
            most interest from students and community members.
          </p>
        </div>
      </section>
    </main>
  );
}

function Admin() {
  const [pass, setPass] = useState('');
  const [ok, setOk] = useState(sessionStorage.getItem('admin_ok') === '1');
  const [metrics, setMetrics] = useState(null);

  const adminPass = import.meta.env.VITE_ADMIN_PASSCODE || 'admin';

  useEffect(() => {
    if (ok) {
      loadMetrics();
    }
  }, [ok]);

  function login() {
    if (pass.trim() === adminPass.trim()) {
      sessionStorage.setItem('admin_ok', '1');
      setOk(true);
    } else {
      alert('Incorrect passcode. Please try again.');
    }
  }

  async function loadMetrics() {
    const [
      { data: visitors },
      { data: views },
      { data: clicks },
      { data: clinics },
      { data: searches },
    ] = await Promise.all([
      supabase.from('visitors').select('*'),
      supabase.from('page_views').select('*'),
      supabase.from('clinic_link_clicks').select('*, clinics(clinic_name, city)'),
      supabase.from('clinics').select('*'),
      supabase.from('search_events').select('*'),
    ]);

    setMetrics({
      visitors: visitors || [],
      views: views || [],
      clicks: clicks || [],
      clinics: clinics || [],
      searches: searches || [],
    });
  }

  if (!ok) {
    return (
      <main className="adminLogin">
        <div>
          <Lock />
          <h1>Admin Metrics</h1>
          <p>Enter the owner passcode to view anonymous project metrics.</p>

          <input
            type="password"
            placeholder="Passcode"
            value={pass}
            onChange={(event) => setPass(event.target.value)}
          />

          <button className="primary" onClick={login}>
            Open Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!metrics) {
    return <p className="loading">Loading metrics...</p>;
  }

  const clicksByClinic = metrics.clicks.reduce((result, click) => {
    const clinicName = click.clinics?.clinic_name || 'Unknown';
    result[clinicName] = (result[clinicName] || 0) + 1;
    return result;
  }, {});

  const topClinicLabels = Object.keys(clicksByClinic).slice(0, 8);

  const barData = {
    labels: topClinicLabels,
    datasets: [
      {
        label: 'Clicks',
        data: topClinicLabels.map((label) => clicksByClinic[label]),
      },
    ],
  };

  const deviceCounts = metrics.clicks.reduce((result, click) => {
    const deviceType = click.device_type || 'Unknown';
    result[deviceType] = (result[deviceType] || 0) + 1;
    return result;
  }, {});

  const donutData = {
    labels: Object.keys(deviceCounts),
    datasets: [
      {
        data: Object.values(deviceCounts),
      },
    ],
  };

  return (
    <main className="admin">
      <section className="sectionTitle">
        <h1>Admin Dashboard</h1>
        <p>Anonymous engagement metrics</p>
      </section>

      <section className="metricGrid">
        <div>
          <b>{metrics.visitors.length}</b>
          <span>Unique Visitors</span>
        </div>

        <div>
          <b>{metrics.views.length}</b>
          <span>Page Views</span>
        </div>

        <div>
          <b>{metrics.clicks.length}</b>
          <span>Clinic Link Clicks</span>
        </div>

        <div>
          <b>{metrics.searches.length}</b>
          <span>Search Events</span>
        </div>
      </section>

      <section className="charts">
        <div className="chartCard">
          <h3>Clicks by Clinic</h3>
          <Bar data={barData} />
        </div>

        <div className="chartCard">
          <h3>Clicks by Device</h3>
          <Doughnut data={donutData} />
        </div>
      </section>

      <section className="tableCard">
        <h3>Recent Clinic Clicks</h3>

        <table>
          <thead>
            <tr>
              <th>Clinic</th>
              <th>City</th>
              <th>Device</th>
              <th>Browser</th>
              <th>Clicked At</th>
            </tr>
          </thead>

          <tbody>
            {metrics.clicks
              .slice(-15)
              .reverse()
              .map((click) => (
                <tr key={click.id}>
                  <td>{click.clinics?.clinic_name}</td>
                  <td>{click.clinics?.city}</td>
                  <td>{click.device_type}</td>
                  <td>{click.browser}</td>
                  <td>{new Date(click.clicked_at).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(
    location.pathname.startsWith('/admin') ? 'admin' : 'home'
  );

  useEffect(() => {
    history.replaceState(null, '', route === 'admin' ? '/admin' : '/');
  }, [route]);

  return (
    <>
      <Header setRoute={setRoute} />

      {route === 'admin' ? <Admin /> : <Home />}

      <footer>
        <div>© {new Date().getFullYear()} Openvol</div>

        <div>Student-led healthcare volunteering directory for Greater Atlanta.</div>

        <button className="adminLink" onClick={() => setRoute('admin')}>
          Admin Dashboard
        </button>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
