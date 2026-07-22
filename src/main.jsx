import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search,
  MapPin,
  ExternalLink,
  Users,
  BarChart3,
  Globe2,
  Lock,
  Bookmark,
} from 'lucide-react';

import { Bar, Doughnut } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Tooltip as MapTooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import {
  trackPageView,
  trackClinicClick,
  trackOpportunityClick,
  trackSearch,
} from './lib/tracking';
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);


const GEORGIA_REGIONS = {
  all: {
    label: 'All Georgia Regions',
    center: [32.72, -83.35],
    zoom: 7,
  },
  atlanta: {
    label: 'Atlanta Regional Commission',
    center: [33.75, -84.39],
    zoom: 9,
  },
  mountains: {
    label: 'Georgia Mountains',
    center: [34.52, -83.75],
    zoom: 8,
  },
  northwest: {
    label: 'Northwest Georgia',
    center: [34.33, -85.02],
    zoom: 8,
  },
  northeast: {
    label: 'Northeast Georgia',
    center: [33.95, -83.35],
    zoom: 8,
  },
  threeRivers: {
    label: 'Three Rivers',
    center: [33.16, -84.72],
    zoom: 8,
  },
  middleGeorgia: {
    label: 'Middle Georgia',
    center: [32.84, -83.63],
    zoom: 8,
  },
  csra: {
    label: 'Central Savannah River Area',
    center: [33.36, -82.12],
    zoom: 8,
  },
  riverValley: {
    label: 'River Valley',
    center: [32.35, -84.98],
    zoom: 8,
  },
  heartAltamaha: {
    label: 'Heart of Georgia–Altamaha',
    center: [32.12, -82.55],
    zoom: 8,
  },
  coastal: {
    label: 'Coastal Georgia',
    center: [31.85, -81.25],
    zoom: 8,
  },
  southwest: {
    label: 'Southwest Georgia',
    center: [31.45, -84.45],
    zoom: 8,
  },
  southern: {
    label: 'Southern Georgia',
    center: [31.15, -82.75],
    zoom: 8,
  },
};

const COUNTY_TO_REGION = {
  Cherokee: 'atlanta',
  Clayton: 'atlanta',
  Cobb: 'atlanta',
  DeKalb: 'atlanta',
  Douglas: 'atlanta',
  Fayette: 'atlanta',
  Fulton: 'atlanta',
  Gwinnett: 'atlanta',
  Henry: 'atlanta',
  Rockdale: 'atlanta',

  Banks: 'mountains',
  Dawson: 'mountains',
  Fannin: 'mountains',
  Forsyth: 'mountains',
  Franklin: 'mountains',
  Gilmer: 'mountains',
  Habersham: 'mountains',
  Hall: 'mountains',
  Hart: 'mountains',
  Lumpkin: 'mountains',
  Pickens: 'mountains',
  Rabun: 'mountains',
  Stephens: 'mountains',
  Towns: 'mountains',
  Union: 'mountains',
  White: 'mountains',

  Bartow: 'northwest',
  Catoosa: 'northwest',
  Chattooga: 'northwest',
  Dade: 'northwest',
  Floyd: 'northwest',
  Gordon: 'northwest',
  Haralson: 'northwest',
  Murray: 'northwest',
  Paulding: 'northwest',
  Polk: 'northwest',
  Walker: 'northwest',
  Whitfield: 'northwest',

  Barrow: 'northeast',
  Clarke: 'northeast',
  Elbert: 'northeast',
  Greene: 'northeast',
  Jackson: 'northeast',
  Jasper: 'northeast',
  Madison: 'northeast',
  Morgan: 'northeast',
  Newton: 'northeast',
  Oconee: 'northeast',
  Oglethorpe: 'northeast',
  Walton: 'northeast',

  Butts: 'threeRivers',
  Carroll: 'threeRivers',
  Coweta: 'threeRivers',
  Heard: 'threeRivers',
  Lamar: 'threeRivers',
  Meriwether: 'threeRivers',
  Pike: 'threeRivers',
  Spalding: 'threeRivers',
  Troup: 'threeRivers',
  Upson: 'threeRivers',

  Baldwin: 'middleGeorgia',
  Bibb: 'middleGeorgia',
  Crawford: 'middleGeorgia',
  Houston: 'middleGeorgia',
  Jones: 'middleGeorgia',
  Monroe: 'middleGeorgia',
  Peach: 'middleGeorgia',
  Pulaski: 'middleGeorgia',
  Putnam: 'middleGeorgia',
  Twiggs: 'middleGeorgia',
  Wilkinson: 'middleGeorgia',

  Burke: 'csra',
  Columbia: 'csra',
  Glascock: 'csra',
  Hancock: 'csra',
  Jefferson: 'csra',
  Jenkins: 'csra',
  Lincoln: 'csra',
  McDuffie: 'csra',
  Richmond: 'csra',
  Taliaferro: 'csra',
  Warren: 'csra',
  Washington: 'csra',
  Wilkes: 'csra',

  Chattahoochee: 'riverValley',
  Clay: 'riverValley',
  Crisp: 'riverValley',
  Dooly: 'riverValley',
  Harris: 'riverValley',
  Macon: 'riverValley',
  Marion: 'riverValley',
  Muscogee: 'riverValley',
  Quitman: 'riverValley',
  Randolph: 'riverValley',
  Schley: 'riverValley',
  Stewart: 'riverValley',
  Sumter: 'riverValley',
  Talbot: 'riverValley',
  Taylor: 'riverValley',
  Webster: 'riverValley',

  Appling: 'heartAltamaha',
  Bleckley: 'heartAltamaha',
  Candler: 'heartAltamaha',
  Dodge: 'heartAltamaha',
  Emanuel: 'heartAltamaha',
  Evans: 'heartAltamaha',
  JeffDavis: 'heartAltamaha',
  Johnson: 'heartAltamaha',
  Laurens: 'heartAltamaha',
  Montgomery: 'heartAltamaha',
  Tattnall: 'heartAltamaha',
  Telfair: 'heartAltamaha',
  Toombs: 'heartAltamaha',
  Treutlen: 'heartAltamaha',
  Wayne: 'heartAltamaha',
  Wheeler: 'heartAltamaha',
  Wilcox: 'heartAltamaha',

  Bryan: 'coastal',
  Bulloch: 'coastal',
  Camden: 'coastal',
  Chatham: 'coastal',
  Effingham: 'coastal',
  Glynn: 'coastal',
  Liberty: 'coastal',
  Long: 'coastal',
  McIntosh: 'coastal',
  Screven: 'coastal',

  Baker: 'southwest',
  Calhoun: 'southwest',
  Colquitt: 'southwest',
  Decatur: 'southwest',
  Dougherty: 'southwest',
  Early: 'southwest',
  Grady: 'southwest',
  Lee: 'southwest',
  Miller: 'southwest',
  Mitchell: 'southwest',
  Seminole: 'southwest',
  Terrell: 'southwest',
  Thomas: 'southwest',
  Worth: 'southwest',

  Atkinson: 'southern',
  Bacon: 'southern',
  BenHill: 'southern',
  Berrien: 'southern',
  Brantley: 'southern',
  Brooks: 'southern',
  Charlton: 'southern',
  Clinch: 'southern',
  Coffee: 'southern',
  Cook: 'southern',
  Echols: 'southern',
  Irwin: 'southern',
  Lanier: 'southern',
  Lowndes: 'southern',
  Pierce: 'southern',
  Tift: 'southern',
  Turner: 'southern',
  Ware: 'southern',
};

function normalizeCountyName(county) {
  return String(county || '')
    .replace(/\s+County$/i, '')
    .replace(/[^A-Za-z]/g, '');
}

function getRegionKey(item) {
  const normalized = normalizeCountyName(item.county);
  return COUNTY_TO_REGION[normalized] || 'all';
}

function matchesRegion(item, regionKey) {
  return !regionKey || regionKey === 'all' || getRegionKey(item) === regionKey;
}

const clinicMarkerIcon = L.divIcon({
  className: 'openvolMapMarkerWrapper',
  html: '<div class="openvolMapMarker clinicMapMarker"><span>+</span></div>',
  iconSize: [34, 42], iconAnchor: [17, 42], tooltipAnchor: [0, -38], popupAnchor: [0, -38],
});

const opportunityMarkerIcon = L.divIcon({
  className: 'openvolMapMarkerWrapper',
  html: '<div class="openvolMapMarker opportunityMapMarker"><span>★</span></div>',
  iconSize: [34, 42], iconAnchor: [17, 42], tooltipAnchor: [0, -38], popupAnchor: [0, -38],
});

function FitMapBounds({ locations, selectedRegion }) {
  const map = useMap();

  useEffect(() => {
    if (selectedRegion && selectedRegion !== 'all') {
      const region = GEORGIA_REGIONS[selectedRegion];
      map.setView(region.center, region.zoom);
      return;
    }

    const points = locations
      .filter(
        (item) =>
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude))
      )
      .map((item) => [Number(item.latitude), Number(item.longitude)]);

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else if (points.length > 1) {
      map.fitBounds(points, {
        padding: [36, 36],
        maxZoom: 12,
      });
    } else {
      map.setView(GEORGIA_REGIONS.all.center, GEORGIA_REGIONS.all.zoom);
    }
  }, [locations, selectedRegion, map]);

  return null;
}

function LocationMap({
  locations,
  type = 'clinic',
  heightClass = '',
  selectedRegion = 'all',
  onRegionChange,
}) {
  const validLocations = locations.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
  const markerIcon = type === 'clinic' ? clinicMarkerIcon : opportunityMarkerIcon;
  return (
    <section className={`locationMapCard ${heightClass}`}>
      <div className="locationMapHeader">
        <div>
          <h3>{type === 'clinic' ? 'Georgia Volunteer Regions' : 'Georgia Shadowing & Research Regions'}</h3>
          <p>Select a Georgia region to display only the locations in that region.</p>
        </div>

        <div className="regionMapControls">
          <label htmlFor={`${type}-region-map-select`}>Region</label>
          <select
            id={`${type}-region-map-select`}
            value={selectedRegion}
            onChange={(event) => onRegionChange?.(event.target.value)}
          >
            {Object.entries(GEORGIA_REGIONS).map(([key, region]) => (
              <option key={key} value={key}>
                {region.label}
              </option>
            ))}
          </select>
          <span className="mappedCount">{validLocations.length} mapped</span>
        </div>
      </div>
      {validLocations.length === 0 ? (
        <div className="mapEmptyState"><MapPin size={28}/><h4>No mapped locations are available yet.</h4><p>Add latitude and longitude values to these database records.</p></div>
      ) : (
        <MapContainer
          center={GEORGIA_REGIONS[selectedRegion]?.center || GEORGIA_REGIONS.all.center}
          zoom={GEORGIA_REGIONS[selectedRegion]?.zoom || GEORGIA_REGIONS.all.zoom}
          scrollWheelZoom
          className="openvolMap"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMapBounds locations={validLocations} selectedRegion={selectedRegion} />
          {validLocations.map((item) => {
            const title = type === 'clinic' ? item.clinic_name : item.opportunity_name;
            const organization = type === 'clinic' ? null : item.organization_name;
            const detailUrl = type === 'clinic' ? item.volunteer_url || item.website_url : item.application_url || item.website_url;
            return (
              <Marker key={`${type}-${item.id}`} position={[Number(item.latitude), Number(item.longitude)]} icon={markerIcon} eventHandlers={{ click: () => detailUrl && window.open(detailUrl, '_blank', 'noopener,noreferrer') }}>
                <MapTooltip direction="top" sticky opacity={1}>
                  <div className="mapTooltipContent"><strong>{title}</strong>{organization && <span>{organization}</span>}<span>{[item.city, item.county ? `${item.county} County` : null].filter(Boolean).join(', ')}</span><small>{type === 'clinic' ? item.volunteer_type : item.opportunity_category}</small></div>
                </MapTooltip>
                <Popup><div className="mapPopupContent"><strong>{title}</strong>{organization && <p>{organization}</p>}<p>{[item.city, item.county ? `${item.county} County` : null].filter(Boolean).join(', ')}</p>{detailUrl && <span>Click the pin to open details.</span>}</div></Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
      {validLocations.length < locations.length && <p className="mapCoverageNotice">{locations.length - validLocations.length} location{locations.length - validLocations.length === 1 ? '' : 's'} do not yet have coordinates and are not shown.</p>}
    </section>
  );
}

function Header({ setRoute, route }) {
  return (
    <header className="header">
      <div className="brand" onClick={() => setRoute('home')}>
        <img src="/openvol-logo.png" alt="Openvol" className="siteLogo" />
      </div>

      <nav>
        <button className={route === 'home' ? 'active' : ''} onClick={() => setRoute('home')}>
          Clinics
        </button>

        <button
          className={route === 'opportunities' ? 'active' : ''}
          onClick={() => setRoute('opportunities')}
        >
          Shadowing & Research
        </button>

        <button
          className={route === 'tracker' ? 'active' : ''}
          onClick={() => setRoute('tracker')}
        >
          My Tracker
        </button>
      </nav>
    </header>
  );
}

function Hero({ clinics, selectedRegion, onRegionChange }) {
  return (
    <section className="hero">
      <div className="heroText">
        <span className="eyebrow">
          <Globe2 size={16} />
          Student-led healthcare volunteering guide
        </span>

        <h1>Find clinic volunteering opportunities across Greater Atlanta.</h1>

        <p>
          Search community clinics, free clinics, shadowing pathways, research programs, and
          outreach organizations that welcome students interested in healthcare service.
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

      <div className="heroMapColumn">
        <LocationMap
          locations={clinics}
          type="clinic"
          heightClass="heroLocationMap"
          selectedRegion={selectedRegion}
          onRegionChange={onRegionChange}
        />
      </div>
    </section>
  );
}

function ProjectInfoCard() {
  return (
    <section className="projectInfoCard">
      <h3>Project Information</h3>

      <div className="projectInfoGrid">
        <div>
          <strong>Project:</strong>
          <span>Openvol</span>
        </div>

        <div>
          <strong>Created By:</strong>
          <span>Rithvik Lal</span>
        </div>

        <div>
          <strong>School:</strong>
          <span>Lassiter High School</span>
        </div>

        <div>
          <strong>Role:</strong>
          <span>Founder & Student Researcher</span>
        </div>

        <div>
          <strong>Purpose:</strong>
          <span>Connecting students with healthcare volunteering opportunities across Georgia.</span>
        </div>

        <div>
          <strong>Last Updated:</strong>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </section>
  );
}

async function getOrCreateStudent(email) {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    alert('Please enter your email first.');
    return null;
  }

  let { data: existing } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('student_profiles')
    .insert({
      email: cleanEmail,
      full_name: null,
      school_name: null,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert('Unable to create student profile.');
    return null;
  }

  return data;
}

function StudentEmailBox({ studentEmail, setStudentEmail }) {
  return (
    <section className="missionBanner">
      <div className="studentEmailBox">
        <b>Save opportunities to your tracker:</b>

        <input
          style={{ maxWidth: '320px', marginLeft: '10px' }}
          type="email"
          placeholder="Enter your email"
          value={studentEmail}
          onChange={(event) => setStudentEmail(event.target.value)}
        />

        <p className="privacyNotice">
          Openvol uses your email address solely to save clinics, shadowing opportunities,
          research opportunities, and application tracking information. Student data is never sold,
          shared, or distributed to third parties.
        </p>
      </div>
    </section>
  );
}

function ClinicCard({ clinic, studentEmail }) {
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

  const saveClinic = async () => {
    const student = await getOrCreateStudent(studentEmail);
    if (!student) return;

    const { error } = await supabase.from('saved_clinics').insert({
      student_id: student.id,
      clinic_id: clinic.id,
      application_status: 'Interested',
    });

    if (error) {
      if (error.message?.toLowerCase().includes('duplicate')) {
        alert('This clinic is already saved.');
      } else {
        console.error(error);
        alert('Unable to save clinic.');
      }
      return;
    }

    alert('Clinic saved to My Tracker.');
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
      </div>

      <div className="cardBody">
        <div className="cardTop">
          <h3>{clinic.clinic_name}</h3>
          <span className="ageBadge">{clinic.minimum_age ? `${clinic.minimum_age}+` : 'Ask'}</span>
        </div>

        {clinic.availability_status === 'available' && (
          <div className="availableBadge">✓ Accepting Volunteers</div>
        )}

        {clinic.availability_status === 'limited' && (
          <div className="limitedBadge">⚠ Limited Volunteer Opportunities</div>
        )}

        {clinic.availability_status === 'unavailable' && (
          <div className="unavailableBadge">
            ✕ Volunteering / Shadowing Currently Not Available
          </div>
        )}

{clinic.date_status === 'not_open_yet' && (
  <div className="limitedBadge">
    Applications Not Open Yet
  </div>
)}

{clinic.date_status === 'closed_by_date' && (
  <div className="unavailableBadge">
    Application Deadline Passed
  </div>
)}

{clinic.date_status === 'program_ended' && (
  <div className="unavailableBadge">
    Program Has Ended
  </div>
)}

{clinic.application_start_date && (
  <div className="verifiedDate">
    Opens: {new Date(clinic.application_start_date).toLocaleDateString()}
  </div>
)}

{clinic.application_end_date && (
  <div className="verifiedDate">
    Deadline: {new Date(clinic.application_end_date).toLocaleDateString()}
  </div>
)}

{clinic.program_start_date && (
  <div className="verifiedDate">
    Program Starts: {new Date(clinic.program_start_date).toLocaleDateString()}
  </div>
)}

{clinic.program_end_date && (
  <div className="verifiedDate">
    Program Ends: {new Date(clinic.program_end_date).toLocaleDateString()}
  </div>
)}

{clinic.last_verified && (
  <div className="verifiedDate">
    Verified: {new Date(clinic.last_verified).toLocaleDateString()}
  </div>
)}
        
        <p className="location">
          <MapPin size={16} />
          {clinic.city}, {clinic.county} County
        </p>

        {clinic.address && <p className="address">{clinic.address}</p>}

        <p>{clinic.notes}</p>

        <div className="tags">
          {clinic.volunteer_type ? (
            clinic.volunteer_type.split(',').map((tag) => (
              <span key={tag.trim()}>
                {tag.trim()}
              </span>
            ))
          ) : (
            <span>Volunteer Opportunity</span>
          )}
        </div>

        <div className="requirements">
          <b>Requirements:</b> {clinic.requirements || 'Contact clinic directly'}
        </div>

        <div className="actions">
          <button onClick={saveClinic}>
            <Bookmark size={15} />
            Save
          </button>

          {clinic.volunteer_url && (
            <button className="primary" onClick={() => handleClick(clinic.volunteer_url)}>
              Volunteer Link <ExternalLink size={15} />
            </button>
          )}

          {clinic.website_url && (
            <button onClick={() => handleClick(clinic.website_url)}>Website</button>
          )}

          <button onClick={() => window.open(mapUrl, '_blank', 'noopener,noreferrer')}>Map</button>
        </div>
      </div>
    </article>
  );
}

function OpportunityCard({ opportunity, studentEmail }) {
  const saveOpportunity = async () => {
    const student = await getOrCreateStudent(studentEmail);
    if (!student) return;

    const { error } = await supabase.from('saved_opportunities').insert({
      student_id: student.id,
      opportunity_id: opportunity.id,
      application_status: 'Interested',
    });

    if (error) {
      if (error.message?.toLowerCase().includes('duplicate')) {
        alert('This opportunity is already saved.');
      } else {
        console.error(error);
        alert('Unable to save opportunity.');
      }
      return;
    }

    alert('Opportunity saved to My Tracker.');
  };

  const handleOpportunityClick = async (url) => {
    await trackOpportunityClick(opportunity.id, url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="clinicCard">
      <div className="clinicLogoBox">
        <div className="clinicInitials">
          {opportunity.organization_name
            .split(' ')
            .filter(Boolean)
            .slice(0, 3)
            .map((word) => word[0])
            .join('')
            .toUpperCase()}
        </div>
      </div>

      <div className="cardBody">
        <div className="cardTop">
          <h3>{opportunity.opportunity_name}</h3>

          <span className="ageBadge">
            {opportunity.minimum_age ? `${opportunity.minimum_age}+` : 'Ask'}
          </span>
        </div>

        {opportunity.date_status === 'not_open_yet' && (
          <div className="limitedBadge">
            Applications Not Open Yet
          </div>
        )}

        {opportunity.date_status === 'closed_by_date' && (
          <div className="unavailableBadge">
            Application Deadline Passed
          </div>
        )}

        {opportunity.date_status === 'program_ended' && (
          <div className="unavailableBadge">
            Program Has Ended
          </div>
        )}

        {opportunity.date_status !== 'closed_by_date' &&
          opportunity.date_status !== 'program_ended' &&
          opportunity.availability_status === 'available' && (
            <div className="availableBadge">
              ✓ Currently Available
            </div>
          )}

        {opportunity.date_status !== 'closed_by_date' &&
          opportunity.date_status !== 'program_ended' &&
          opportunity.availability_status === 'limited' && (
            <div className="limitedBadge">
              ⚠ Limited Availability
            </div>
          )}

        {opportunity.availability_status === 'waitlist' && (
          <div className="limitedBadge">
            ⏳ Waitlist Only
          </div>
        )}

        {opportunity.availability_status === 'closed' && (
          <div className="unavailableBadge">
            Application Period Closed
          </div>
        )}

        {opportunity.availability_status === 'unavailable' && (
          <div className="unavailableBadge">
            Shadowing / Research Not Currently Available
          </div>
        )}

        {opportunity.last_verified && (
          <div className="verifiedDate">
            Verified: {new Date(opportunity.last_verified).toLocaleDateString()}
          </div>
        )}

        <div className="tags">
          <span>{opportunity.opportunity_category || 'Opportunity'}</span>
        </div>

        <p className="location">
          <MapPin size={16} />
          {opportunity.city}, {opportunity.county} County
        </p>

        <p>
          <b>Organization:</b> {opportunity.organization_name}
        </p>

        {opportunity.eligibility && (
          <div className="requirements">
            <b>Eligibility:</b> {opportunity.eligibility}
          </div>
        )}

        {opportunity.requirements && (
          <div className="requirements">
            <b>Requirements:</b> {opportunity.requirements}
          </div>
        )}

        {opportunity.application_deadline && (
          <div className="requirements">
            <b>Application Deadline:</b> {opportunity.application_deadline}
          </div>
        )}

        <p>{opportunity.notes}</p>

        <div className="actions">
          <button onClick={saveOpportunity}>
            <Bookmark size={15} />
            Save
          </button>

          {opportunity.application_url && (
            <button
              className="primary"
              onClick={() => handleOpportunityClick(opportunity.application_url)}
            >
              Apply / Learn More <ExternalLink size={15} />
            </button>
          )}

          {opportunity.website_url && (
            <button
              onClick={() => handleOpportunityClick(opportunity.website_url)}
            >
              Website
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback() {
    if (!rating) {
      alert('Please select a rating.');
      return;
    }

    const { error } = await supabase.from('website_feedback').insert({
      rating,
      comments,
    });

    if (error) {
      console.error(error);
      alert('Unable to submit feedback.');
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="feedbackSection">
        <h3>Thank You!</h3>
        <p>Your feedback helps improve Openvol.</p>
      </section>
    );
  }

  return (
    <section className="feedbackSection">
      <h3>Rate Your Experience</h3>

      <p>
        How helpful was Openvol in finding volunteering, shadowing, or research opportunities?
      </p>

      <div className="ratingButtons">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            className={rating === num ? 'ratingActive' : ''}
            onClick={() => setRating(num)}
          >
            ⭐ {num}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Optional comments or suggestions..."
        value={comments}
        onChange={(event) => setComments(event.target.value)}
      />

      <button className="primary" onClick={submitFeedback}>
        Submit Feedback
      </button>
    </section>
  );
}

function Home({ studentEmail, setStudentEmail }) {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchText: '',
    city: '',
    county: '',
    region: 'all',
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

    if (error) console.error('Error loading clinics:', error);

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
      const matchesSelectedRegion = matchesRegion(clinic, filters.region);

      const matchesAge =
        !filters.minimumAge ||
        !clinic.minimum_age ||
        Number(filters.minimumAge) >= clinic.minimum_age;

      return (
        matchesText &&
        matchesCity &&
        matchesCounty &&
        matchesSelectedRegion &&
        matchesAge
      );
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
      <Hero
        clinics={filteredClinics}
        selectedRegion={filters.region}
        onRegionChange={(region) => updateFilter('region', region)}
      />

      <StudentEmailBox studentEmail={studentEmail} setStudentEmail={setStudentEmail} />

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

        <select
          value={filters.region}
          onChange={(event) => updateFilter('region', event.target.value)}
          onBlur={handleSearch}
        >
          {Object.entries(GEORGIA_REGIONS).map(([key, region]) => (
            <option key={key} value={key}>
              {region.label}
            </option>
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
        <div>
          <strong>{clinics.length}</strong>
          <span>Clinics</span>
        </div>

        <div>
          <strong>{counties.length}</strong>
          <span>Counties</span>
        </div>

        <div>
          <strong>{highSchoolFriendlyCount}</strong>
          <span>High School Friendly</span>
        </div>
      </section>

      <div className="missionBanner">
        Helping students discover healthcare volunteering, shadowing, community outreach, and
        service-learning opportunities throughout Georgia.
      </div>

      <section className="sectionTitle">
        <h2>Clinic opportunities</h2>
        <p>{filteredClinics.length} matching clinics</p>
      </section>

      {loading ? (
        <p className="loading">Loading clinics...</p>
      ) : filteredClinics.length === 0 ? (
        <div className="noResults">
          <h3>No Matching Clinics Found</h3>
          <p>Try changing your search criteria, county, city, or age filter.</p>
          <button
            className="primary"
            onClick={() => setFilters({ searchText: '', city: '', county: '', region: 'all', minimumAge: '' })}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <section className="grid">
          {filteredClinics.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} studentEmail={studentEmail} />
          ))}
        </section>
      )}

      <div className="disclaimer">
        Volunteer requirements may change. Please verify age requirements, application procedures,
        and eligibility directly with each organization.
      </div>

      <FeedbackSection />

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

function Opportunities({ studentEmail, setStudentEmail }) {
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState({
    searchText: '',
    category: '',
    county: '',
    region: 'all',
  });

  useEffect(() => {
    trackPageView('/opportunities');
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('active_status', true)
      .order('organization_name');

    if (error) console.error(error);

    setOpportunities(data || []);
  }

  const categories = [
    ...new Set(opportunities.map((item) => item.opportunity_category).filter(Boolean)),
  ];

  const counties = [...new Set(opportunities.map((item) => item.county).filter(Boolean))];

  const filtered = opportunities.filter((item) => {
    const searchText = filters.searchText.toLowerCase();

    const searchableText = [
      item.organization_name,
      item.opportunity_name,
      item.opportunity_category,
      item.city,
      item.county,
      item.notes,
      item.eligibility,
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!searchText || searchableText.includes(searchText)) &&
      (!filters.category || item.opportunity_category === filters.category) &&
      (!filters.county || item.county === filters.county) &&
      matchesRegion(item, filters.region)
    );
  });

  return (
    <main>
      <section className="sectionTitle">
        <h1>Shadowing & Research</h1>
        <p>{filtered.length} matching opportunities</p>
      </section>

      <StudentEmailBox studentEmail={studentEmail} setStudentEmail={setStudentEmail} />

      <LocationMap
        locations={filtered}
        type="opportunity"
        heightClass="opportunityLocationMap"
        selectedRegion={filters.region}
        onRegionChange={(region) =>
          setFilters((current) => ({ ...current, region }))
        }
      />

      <section className="searchPanel">
        <div className="searchBox">
          <Search size={20} />
          <input
            placeholder="Search shadowing, research, hospital, or organization"
            value={filters.searchText}
            onChange={(event) =>
              setFilters((current) => ({ ...current, searchText: event.target.value }))
            }
          />
        </div>

        <select
          value={filters.category}
          onChange={(event) =>
            setFilters((current) => ({ ...current, category: event.target.value }))
          }
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <select
          value={filters.county}
          onChange={(event) =>
            setFilters((current) => ({ ...current, county: event.target.value }))
          }
        >
          <option value="">All counties</option>
          {counties.map((county) => (
            <option key={county}>{county}</option>
          ))}
        </select>

        <select
          value={filters.region}
          onChange={(event) =>
            setFilters((current) => ({ ...current, region: event.target.value }))
          }
        >
          {Object.entries(GEORGIA_REGIONS).map(([key, region]) => (
            <option key={key} value={key}>
              {region.label}
            </option>
          ))}
        </select>
      </section>

      {filtered.length === 0 ? (
        <div className="noResults">
          <h3>No Matching Opportunities Found</h3>
          <p>Try clearing your filters or searching a different category.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              studentEmail={studentEmail}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function Tracker({ studentEmail, setStudentEmail }) {
  const [savedClinics, setSavedClinics] = useState([]);
  const [savedOpportunities, setSavedOpportunities] = useState([]);

  useEffect(() => {
    if (studentEmail) loadTracker();
  }, [studentEmail]);

  async function loadTracker() {
    const student = await getOrCreateStudent(studentEmail);
    if (!student) return;

    const { data: clinics } = await supabase
      .from('saved_clinics')
      .select('*, clinics(*)')
      .eq('student_id', student.id)
      .order('saved_at', { ascending: false });

    const { data: opportunities } = await supabase
      .from('saved_opportunities')
      .select('*, opportunities(*)')
      .eq('student_id', student.id)
      .order('saved_at', { ascending: false });

    setSavedClinics(clinics || []);
    setSavedOpportunities(opportunities || []);
  }

  async function updateClinicStatus(savedId, status) {
    await supabase.from('saved_clinics').update({ application_status: status }).eq('id', savedId);
    loadTracker();
  }

  async function updateOpportunityStatus(savedId, status) {
    await supabase
      .from('saved_opportunities')
      .update({ application_status: status })
      .eq('id', savedId);
    loadTracker();
  }

  const statuses = [
    'Interested',
    'Applied',
    'Interview Scheduled',
    'Accepted',
    'Waitlisted',
    'Not Eligible',
    'Closed',
  ];

  return (
    <main>
      <section className="sectionTitle">
        <h1>My Tracker</h1>
        <p>Saved clinics and opportunities</p>
      </section>

      <StudentEmailBox studentEmail={studentEmail} setStudentEmail={setStudentEmail} />

      {!studentEmail ? (
        <div className="noResults">
          <h3>Enter your email to view your tracker</h3>
          <p>Your saved clinics and opportunities will appear here.</p>
        </div>
      ) : (
        <>
          <section className="tableCard">
            <h3>Saved Clinics</h3>

            <table>
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Volunteer Link</th>
                </tr>
              </thead>

              <tbody>
                {savedClinics.map((item) => (
                  <tr key={item.id}>
                    <td>{item.clinics?.clinic_name}</td>
                    <td>{item.clinics?.city}</td>
                    <td>
                      <select
                        value={item.application_status}
                        onChange={(event) => updateClinicStatus(item.id, event.target.value)}
                      >
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {item.clinics?.volunteer_url && (
                        <button
                          onClick={() =>
                            window.open(item.clinics.volunteer_url, '_blank', 'noopener,noreferrer')
                          }
                        >
                          Open
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="tableCard">
            <h3>Saved Shadowing & Research Opportunities</h3>

            <table>
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Organization</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Link</th>
                </tr>
              </thead>

              <tbody>
                {savedOpportunities.map((item) => (
                  <tr key={item.id}>
                    <td>{item.opportunities?.opportunity_name}</td>
                    <td>{item.opportunities?.organization_name}</td>
                    <td>{item.opportunities?.opportunity_category}</td>
                    <td>
                      <select
                        value={item.application_status}
                        onChange={(event) => updateOpportunityStatus(item.id, event.target.value)}
                      >
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {item.opportunities?.application_url && (
                        <button
                          onClick={() =>
                            window.open(
                              item.opportunities.application_url,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        >
                          Open
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}

function Admin() {
  const [pass, setPass] = useState('');
  const [ok, setOk] = useState(sessionStorage.getItem('admin_ok') === '1');
  const [metrics, setMetrics] = useState(null);

  const adminPass = import.meta.env.VITE_ADMIN_PASSCODE || 'admin';

  useEffect(() => {
    if (ok) loadMetrics();
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
      { data: opportunityClicks },
      { data: clinics },
      { data: opportunities },
      { data: savedClinics },
      { data: savedOpportunities },
      { data: searches },
      { data: feedback },
    ] = await Promise.all([
      supabase.from('visitors').select('*'),
      supabase.from('page_views').select('*'),
      supabase.from('clinic_link_clicks').select('*, clinics(clinic_name, city)'),
      supabase
        .from('opportunity_link_clicks')
        .select('*, opportunities(opportunity_name, organization_name, opportunity_category, city)'),
      supabase.from('clinics').select('*'),
      supabase.from('opportunities').select('*'),
      supabase.from('saved_clinics').select('*'),
      supabase.from('saved_opportunities').select('*'),
      supabase.from('search_events').select('*'),
      supabase.from('website_feedback').select('*'),
    ]);

    setMetrics({
      visitors: visitors || [],
      views: views || [],
      clicks: clicks || [],
      opportunityClicks: opportunityClicks || [],
      clinics: clinics || [],
      opportunities: opportunities || [],
      savedClinics: savedClinics || [],
      savedOpportunities: savedOpportunities || [],
      searches: searches || [],
      feedback: feedback || [],
    });
  }

  if (!ok) {
    return (
      <main className="adminLogin">
        <div>
          <Lock />
          <h1>Admin Metrics</h1>
          <p>Enter the owner passcode to view project metrics.</p>

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

  if (!metrics) return <p className="loading">Loading metrics...</p>;

  const avgRating =
    metrics.feedback.length > 0
      ? (
          metrics.feedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          metrics.feedback.length
        ).toFixed(1)
      : '0';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  const clicksByClinic = metrics.clicks.reduce((result, click) => {
    const clinicName = click.clinics?.clinic_name || 'Unknown';
    result[clinicName] = (result[clinicName] || 0) + 1;
    return result;
  }, {});

  const topClinicLabels = Object.keys(clicksByClinic).slice(0, 10);

  const clinicBarData = {
    labels: topClinicLabels,
    datasets: [
      {
        label: 'Clinic Link Clicks',
        data: topClinicLabels.map((label) => clicksByClinic[label]),
        backgroundColor: '#0EA5E9',
        borderColor: '#0284C7',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const opportunityCategoryCounts = metrics.opportunities.reduce((result, item) => {
    const category = item.opportunity_category || 'Other';
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});

  const opportunityLabels = Object.keys(opportunityCategoryCounts);

  const opportunityBarData = {
    labels: opportunityLabels,
    datasets: [
      {
        label: 'Shadowing / Research Opportunities',
        data: opportunityLabels.map((label) => opportunityCategoryCounts[label]),
        backgroundColor: [
          '#0EA5E9',
          '#14B8A6',
          '#8B5CF6',
          '#F59E0B',
          '#EF4444',
          '#22C55E',
        ],
        borderColor: '#ffffff',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const clicksByOpportunity = metrics.opportunityClicks.reduce((result, click) => {
    const opportunityName = click.opportunities?.opportunity_name || 'Unknown';
    result[opportunityName] = (result[opportunityName] || 0) + 1;
    return result;
  }, {});

  const topOpportunityLabels = Object.keys(clicksByOpportunity).slice(0, 10);

  const opportunityClickBarData = {
    labels: topOpportunityLabels,
    datasets: [
      {
        label: 'Opportunity Link Clicks',
        data: topOpportunityLabels.map((label) => clicksByOpportunity[label]),
        backgroundColor: '#14B8A6',
        borderColor: '#0F766E',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const allClicks = [...metrics.clicks, ...metrics.opportunityClicks];

  const deviceCounts = allClicks.reduce((result, click) => {
    const deviceType = click.device_type || 'Unknown';
    result[deviceType] = (result[deviceType] || 0) + 1;
    return result;
  }, {});

  const devicePieData = {
    labels: Object.keys(deviceCounts),
    datasets: [
      {
        data: Object.values(deviceCounts),
        backgroundColor: [
          '#0EA5E9',
          '#14B8A6',
          '#8B5CF6',
          '#F59E0B',
          '#EF4444',
          '#22C55E',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  return (
  <main className="admin">
      <section className="sectionTitle">
        <h1>Admin Dashboard</h1>
        <p>Openvol platform metrics</p>
      </section>

      <ProjectInfoCard />

      <section className="adminSummaryGrid">
        <div>
          <b>{metrics.visitors.length}</b>
          <span>Unique Visitors</span>
        </div>

        <div>
          <b>{metrics.views.length}</b>
          <span>Page Views</span>
        </div>

        <div>
          <b>{metrics.clinics.length}</b>
          <span>Clinics Listed</span>
        </div>

        <div>
          <b>{metrics.opportunities.length}</b>
          <span>Shadowing / Research</span>
        </div>

        <div>
          <b>{metrics.clicks.length}</b>
          <span>Clinic Link Clicks</span>
        </div>

        <div>
          <b>{metrics.opportunityClicks.length}</b>
          <span>Opportunity Link Clicks</span>
        </div>

        <div>
          <b>{metrics.savedClinics.length}</b>
          <span>Saved Clinics</span>
        </div>

        <div>
          <b>{metrics.savedOpportunities.length}</b>
          <span>Saved Opportunities</span>
        </div>

        <div>
          <b>{avgRating} ⭐</b>
          <span>Average Rating</span>
        </div>
      </section>

      <section className="adminChartsGrid">
        <div className="chartCard">
          <h3>Top Clinic Link Clicks</h3>
          <Bar data={clinicBarData} options={chartOptions} />
        </div>

        <div className="chartCard">
          <h3>Top Shadowing & Research Link Clicks</h3>
          <Bar data={opportunityClickBarData} options={chartOptions} />
        </div>

        <div className="chartCard">
          <h3>Shadowing & Research by Category</h3>
          <Bar data={opportunityBarData} options={chartOptions} />
        </div>

        <div className="chartCard">
          <h3>Device Used</h3>
          <Doughnut data={devicePieData} options={doughnutOptions} />
        </div>
      </section>

      <section className="tableCard">
        <h3>Recent Website Feedback</h3>

        <table>
          <thead>
            <tr>
              <th>Rating</th>
              <th>Comments</th>
              <th>Submitted</th>
            </tr>
          </thead>

          <tbody>
            {metrics.feedback
              .slice(-10)
              .reverse()
              .map((item) => (
                <tr key={item.id}>
                  <td>{item.rating} ⭐</td>
                  <td>{item.comments || 'No comments'}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
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
    location.pathname.startsWith('/admin')
      ? 'admin'
      : location.pathname.startsWith('/opportunities')
        ? 'opportunities'
        : location.pathname.startsWith('/tracker')
          ? 'tracker'
          : 'home'
  );

  const [studentEmail, setStudentEmail] = useState(
    localStorage.getItem('openvol_student_email') || ''
  );

  useEffect(() => {
    localStorage.setItem('openvol_student_email', studentEmail);
  }, [studentEmail]);

  useEffect(() => {
    history.replaceState(null, '', route === 'home' ? '/' : `/${route}`);
  }, [route]);

  return (
    <>
      <div className="worldSaversBanner">
        <a href="https://theworldsavers.org">
          🌎 Back to The World Savers
        </a>
      </div>

      <Header setRoute={setRoute} route={route} />

      {route === 'admin' ? (
        <Admin />
      ) : route === 'opportunities' ? (
        <Opportunities
          studentEmail={studentEmail}
          setStudentEmail={setStudentEmail}
        />
      ) : route === 'tracker' ? (
        <Tracker
          studentEmail={studentEmail}
          setStudentEmail={setStudentEmail}
        />
      ) : (
        <Home
          studentEmail={studentEmail}
          setStudentEmail={setStudentEmail}
        />
      )}

      <footer>
        <div>© {new Date().getFullYear()} Openvol</div>

        <div>
          Student-led healthcare volunteering directory for Greater Atlanta.
        </div>

        <button className="adminLink" onClick={() => setRoute('admin')}>
          Admin Dashboard
        </button>
      </footer>
    </>
  );
}


createRoot(document.getElementById('root')).render(<App />);
