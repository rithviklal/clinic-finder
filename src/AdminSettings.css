import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Building2, Download, MousePointerClick,
  RefreshCw, Search, Settings, TrendingUp
} from 'lucide-react';
import {
  CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Title, Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { supabase } from '../lib/supabase';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const RANGE_OPTIONS = [7, 30, 90];

function number(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function dateKey(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(row => headers.map(key => escape(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ icon, label, value, hint }) {
  return (
    <article className="admin-metric-card">
      <div className="admin-metric-icon">{icon}</div>
      <div><span>{label}</span><strong>{number(value)}</strong><small>{hint}</small></div>
    </article>
  );
}

function RankingTable({ title, rows, labelKey, valueKey, emptyText }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>{title}</h2></div>
      {rows.length ? (
        <div className="admin-ranking-list">
          {rows.map((row, index) => (
            <div className="admin-ranking-row" key={`${row[labelKey]}-${index}`}>
              <span className="admin-rank">{index + 1}</span>
              <span className="admin-ranking-label">{row[labelKey]}</span>
              <strong>{number(row[valueKey])}</strong>
            </div>
          ))}
        </div>
      ) : <p className="admin-empty">{emptyText}</p>}
    </section>
  );
}

export default function AdminDashboard({ onOpenSettings }) {
  const [range, setRange] = useState(30);
  const [daily, setDaily] = useState([]);
  const [pages, setPages] = useState([]);
  const [searches, setSearches] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '', refreshedAt: null });

  const load = useCallback(async () => {
    setStatus(current => ({ ...current, loading: true, error: '' }));
    const start = dateKey(range - 1);

    const [dailyResult, pageResult, searchResult, clinicResult, opportunityResult] = await Promise.all([
      supabase.from('analytics_daily').select('*').gte('analytics_date', start).order('analytics_date'),
      supabase.from('analytics_pages').select('page_path,view_count').gte('analytics_date', start).order('view_count', { ascending: false }).limit(100),
      supabase.from('analytics_searches').select('search_term,search_count').gte('analytics_date', start).order('search_count', { ascending: false }).limit(100),
      supabase.from('analytics_clinics').select('clinic_id,click_count').gte('analytics_date', start).order('click_count', { ascending: false }).limit(100),
      supabase.from('analytics_opportunities').select('opportunity_id,click_count').gte('analytics_date', start).order('click_count', { ascending: false }).limit(100)
    ]);

    const error = [dailyResult, pageResult, searchResult, clinicResult, opportunityResult].find(result => result.error)?.error;
    if (error) {
      setStatus({ loading: false, error: error.message, refreshedAt: null });
      return;
    }

    const aggregate = (rows, key, valueKey) => Object.values((rows || []).reduce((acc, row) => {
      const id = row[key] || 'Unknown';
      acc[id] ||= { [key]: id, [valueKey]: 0 };
      acc[id][valueKey] += Number(row[valueKey] || 0);
      return acc;
    }, {})).sort((a, b) => b[valueKey] - a[valueKey]);

    setDaily(dailyResult.data || []);
    setPages(aggregate(pageResult.data, 'page_path', 'view_count'));
    setSearches(aggregate(searchResult.data, 'search_term', 'search_count'));
    setClinics(aggregate(clinicResult.data, 'clinic_id', 'click_count'));
    setOpportunities(aggregate(opportunityResult.data, 'opportunity_id', 'click_count'));
    setStatus({ loading: false, error: '', refreshedAt: new Date() });
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => daily.reduce((sum, row) => ({
    page_views: sum.page_views + Number(row.page_views || 0),
    searches: sum.searches + Number(row.searches || 0),
    clinic_clicks: sum.clinic_clicks + Number(row.clinic_clicks || 0),
    opportunity_clicks: sum.opportunity_clicks + Number(row.opportunity_clicks || 0)
  }), { page_views: 0, searches: 0, clinic_clicks: 0, opportunity_clicks: 0 }), [daily]);

  const chartData = {
    labels: daily.map(row => new Date(`${row.analytics_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      { label: 'Page views', data: daily.map(row => row.page_views), tension: 0.32, fill: true },
      { label: 'Searches', data: daily.map(row => row.searches), tension: 0.32 }
    ]
  };

  const exportAll = () => downloadCsv(`openvol-analytics-${range}d.csv`, daily);

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div><span className="admin-eyebrow"><BarChart3 size={16} /> Build 72 Analytics</span><h1>Openvol Analytics</h1><p>Privacy-first, aggregate traffic metrics with no visitor profiling.</p></div>
        <div className="admin-actions">
          <button onClick={load} disabled={status.loading}><RefreshCw size={17} className={status.loading ? 'spin' : ''} /> Refresh</button>
          <button onClick={exportAll}><Download size={17} /> Export CSV</button>
          <button className="primary" onClick={onOpenSettings}><Settings size={17} /> Settings</button>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-range" aria-label="Analytics date range">
          {RANGE_OPTIONS.map(days => <button key={days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days} days</button>)}
        </div>
        <small>{status.refreshedAt ? `Updated ${status.refreshedAt.toLocaleTimeString()}` : 'Aggregate metrics only'}</small>
      </section>

      {status.error && <div className="admin-error"><strong>Analytics could not load.</strong><span>{status.error}</span></div>}

      <section className="admin-metrics">
        <MetricCard icon={<Activity />} label="Page views" value={totals.page_views} hint={`Last ${range} days`} />
        <MetricCard icon={<Search />} label="Searches" value={totals.searches} hint="Normalized search totals" />
        <MetricCard icon={<Building2 />} label="Clinic clicks" value={totals.clinic_clicks} hint="Outbound engagement" />
        <MetricCard icon={<MousePointerClick />} label="Opportunity clicks" value={totals.opportunity_clicks} hint="Outbound engagement" />
      </section>

      <section className="admin-panel admin-chart-panel">
        <div className="admin-panel-heading"><div><span>Traffic trend</span><h2>Daily activity</h2></div><TrendingUp size={22} /></div>
        <div className="admin-chart"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
      </section>

      <section className="admin-grid">
        <RankingTable title="Top pages" rows={pages.slice(0, 10)} labelKey="page_path" valueKey="view_count" emptyText="No page activity yet." />
        <RankingTable title="Top searches" rows={searches.slice(0, 10)} labelKey="search_term" valueKey="search_count" emptyText="No searches recorded yet." />
        <RankingTable title="Top clinics" rows={clinics.slice(0, 10)} labelKey="clinic_id" valueKey="click_count" emptyText="No clinic clicks recorded yet." />
        <RankingTable title="Top opportunities" rows={opportunities.slice(0, 10)} labelKey="opportunity_id" valueKey="click_count" emptyText="No opportunity clicks recorded yet." />
      </section>
    </main>
  );
}
