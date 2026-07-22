import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Bookmark, Building2, CalendarDays, Download,
  FileText, Lightbulb, MapPin, MessageSquare, MousePointerClick,
  RefreshCw, Search, Settings, Sparkles, Target, TrendingUp, Users
} from 'lucide-react';
import {
  CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Title, Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { supabase } from './lib/supabase';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const RANGE_OPTIONS = [7, 30, 90];
const GEORGIA_SIGNALS = ['atlanta', 'alpharetta', 'savannah', 'augusta', 'macon', 'athens', 'columbus', 'marietta', 'roswell', 'johns creek', 'fulton', 'cobb', 'gwinnett', 'dekalb', 'cherokee', 'forsyth'];
const HISTORICAL_TABLES = [
  { table: 'saved_clinics', label: 'Saved clinics', icon: Bookmark },
  { table: 'saved_opportunities', label: 'Saved opportunities', icon: Bookmark },
  { table: 'search_events', label: 'Historical searches', icon: Search },
  { table: 'student_profiles', label: 'Student profiles', icon: Users },
  { table: 'visitors', label: 'Historical visitors', icon: Activity },
  { table: 'website_feedback', label: 'Website feedback', icon: MessageSquare }
];

function number(value) {
  if (typeof value === 'string' && value.trim().endsWith('%')) return value;
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

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
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

function InsightCard({ title, text, tone = 'neutral' }) {
  return (
    <article className={`admin-insight ${tone}`}>
      <div className="admin-insight-icon"><Lightbulb size={19} /></div>
      <div><strong>{title}</strong><p>{text}</p></div>
    </article>
  );
}

function FunnelStep({ label, value, percent, icon }) {
  return (
    <div className="admin-funnel-step">
      <div className="admin-funnel-icon">{icon}</div>
      <div><span>{label}</span><strong>{number(value)}</strong></div>
      <b>{percent}%</b>
    </div>
  );
}

function HistoricalCard({ item }) {
  const Icon = item.icon;
  return (
    <article className={`historical-card ${item.error ? 'unavailable' : ''}`}>
      <div className="historical-icon"><Icon size={20} /></div>
      <div>
        <span>{item.label}</span>
        <strong>{item.error ? '—' : number(item.count)}</strong>
        <small>{item.error ? 'Unavailable with current database permissions' : 'All-time records'}</small>
      </div>
    </article>
  );
}

export default function AdminDashboard({ onOpenSettings }) {
  const [range, setRange] = useState(30);
  const [daily, setDaily] = useState([]);
  const [pages, setPages] = useState([]);
  const [searches, setSearches] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [historical, setHistorical] = useState(HISTORICAL_TABLES.map(item => ({ ...item, count: 0, error: '' })));
  const [status, setStatus] = useState({ loading: true, error: '', refreshedAt: null });

  const load = useCallback(async () => {
    setStatus(current => ({ ...current, loading: true, error: '' }));
    const start = dateKey(range - 1);

    const analyticsPromise = Promise.all([
      supabase.from('analytics_daily').select('*').gte('analytics_date', start).order('analytics_date'),
      supabase.from('analytics_pages').select('page_path,view_count').gte('analytics_date', start).order('view_count', { ascending: false }).limit(100),
      supabase.from('analytics_searches').select('search_term,search_count').gte('analytics_date', start).order('search_count', { ascending: false }).limit(100),
      supabase.from('analytics_clinics').select('clinic_id,click_count').gte('analytics_date', start).order('click_count', { ascending: false }).limit(100),
      supabase.from('analytics_opportunities').select('opportunity_id,click_count').gte('analytics_date', start).order('click_count', { ascending: false }).limit(100)
    ]);

    const historicalPromise = Promise.all(HISTORICAL_TABLES.map(async item => {
      const { count, error } = await supabase.from(item.table).select('*', { count: 'exact', head: true });
      return { ...item, count: count || 0, error: error?.message || '' };
    }));

    const [analyticsResults, historicalResults] = await Promise.all([analyticsPromise, historicalPromise]);
    const [dailyResult, pageResult, searchResult, clinicResult, opportunityResult] = analyticsResults;
    const error = analyticsResults.find(result => result.error)?.error;

    const aggregate = (rows, key, valueKey) => Object.values((rows || []).reduce((acc, row) => {
      const id = row[key] || 'Unknown';
      acc[id] ||= { [key]: id, [valueKey]: 0 };
      acc[id][valueKey] += Number(row[valueKey] || 0);
      return acc;
    }, {})).sort((a, b) => b[valueKey] - a[valueKey]);

    setHistorical(historicalResults);
    if (error) {
      setStatus({ loading: false, error: error.message, refreshedAt: new Date() });
      return;
    }

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

  const historicalTotals = useMemo(() => Object.fromEntries(historical.map(item => [item.table, item.error ? 0 : item.count])), [historical]);
  const totalSaved = (historicalTotals.saved_clinics || 0) + (historicalTotals.saved_opportunities || 0);
  const totalSearchesAllTime = (historicalTotals.search_events || 0) + totals.searches;

  const executive = useMemo(() => {
    const today = daily.at(-1) || {};
    const yesterday = daily.at(-2) || {};
    const lastSeven = daily.slice(-7);
    const clicks = totals.clinic_clicks + totals.opportunity_clicks;
    return {
      todayViews: Number(today.page_views || 0),
      yesterdayViews: Number(yesterday.page_views || 0),
      sevenDayViews: sumRows(lastSeven, 'page_views'),
      sevenDaySearches: sumRows(lastSeven, 'searches'),
      engagement: totals.page_views ? Math.round((clicks / totals.page_views) * 100) : 0,
      searchConversion: totals.page_views ? Math.round((totals.searches / totals.page_views) * 100) : 0
    };
  }, [daily, totals]);

  const insights = useMemo(() => {
    const cards = [];
    if (daily.length) {
      const midpoint = Math.max(1, Math.floor(daily.length / 2));
      const previousRows = daily.slice(0, midpoint);
      const currentRows = daily.slice(midpoint);
      const viewTrend = percentChange(sumRows(currentRows, 'page_views'), sumRows(previousRows, 'page_views'));
      const searchTrend = percentChange(sumRows(currentRows, 'searches'), sumRows(previousRows, 'searches'));
      cards.push(
        { title: viewTrend >= 0 ? 'Traffic is growing' : 'Traffic softened', text: `Page views are ${Math.abs(viewTrend)}% ${viewTrend >= 0 ? 'higher' : 'lower'} in the latest half of this range.`, tone: viewTrend >= 0 ? 'positive' : 'warning' },
        { title: searchTrend >= 0 ? 'Search demand increased' : 'Search demand declined', text: `Search activity is ${Math.abs(searchTrend)}% ${searchTrend >= 0 ? 'higher' : 'lower'} than the earlier half of this range.`, tone: searchTrend >= 0 ? 'positive' : 'warning' }
      );
    }
    if (historicalTotals.student_profiles || totalSaved) cards.push({ title: 'Historical student engagement', text: `${number(historicalTotals.student_profiles)} student profiles have created ${number(totalSaved)} saved-item records.`, tone: 'positive' });
    if (historicalTotals.search_events) cards.push({ title: 'Historical search depth', text: `${number(historicalTotals.search_events)} legacy search events are now included alongside Build 73 analytics.`, tone: 'neutral' });
    if (searches[0]) cards.push({ title: 'Top student interest', text: `“${searches[0].search_term}” is the most common recent search.`, tone: 'neutral' });
    return cards.length ? cards.slice(0, 4) : [{ title: 'Waiting for activity', text: 'Insights will appear after analytics or historical records are accessible.', tone: 'neutral' }];
  }, [daily, historicalTotals, searches, totalSaved]);

  const geographicSignals = useMemo(() => searches.filter(row => GEORGIA_SIGNALS.some(place => String(row.search_term || '').toLowerCase().includes(place))).slice(0, 8), [searches]);

  const forecast = useMemo(() => {
    if (daily.length < 4) return { direction: 'Not enough data', projected: 0, confidence: 'Low' };
    const recent = daily.slice(-3);
    const earlier = daily.slice(-6, -3);
    const recentAverage = sumRows(recent, 'page_views') / recent.length;
    const earlierAverage = earlier.length ? sumRows(earlier, 'page_views') / earlier.length : recentAverage;
    const growth = earlierAverage ? (recentAverage - earlierAverage) / earlierAverage : 0;
    return { direction: growth >= 0 ? 'Upward' : 'Downward', projected: Math.max(0, Math.round(recentAverage * (1 + growth) * 7)), confidence: daily.length >= 14 ? 'Medium' : 'Low' };
  }, [daily]);

  const chartData = {
    labels: daily.map(row => new Date(`${row.analytics_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      { label: 'Page views', data: daily.map(row => row.page_views), tension: 0.32, fill: true },
      { label: 'Searches', data: daily.map(row => row.searches), tension: 0.32 }
    ]
  };

  const exportAll = () => downloadCsv(`openvol-analytics-${range}d.csv`, daily);
  const printReport = () => {
    const report = window.open('', '_blank', 'noopener,noreferrer');
    if (!report) return;
    report.document.write(`<html><head><title>Openvol Build 73 Executive Report</title><style>body{font-family:Arial;padding:40px;color:#15332c}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.card{border:1px solid #dbe5e2;border-radius:12px;padding:16px}.muted{color:#657873}</style></head><body><h1>Openvol Executive Analytics Report</h1><p class="muted">Build 73 · Generated ${new Date().toLocaleString()}</p><div class="grid"><div class="card"><b>Page views</b><h2>${number(totals.page_views)}</h2></div><div class="card"><b>All-time searches</b><h2>${number(totalSearchesAllTime)}</h2></div><div class="card"><b>Student profiles</b><h2>${number(historicalTotals.student_profiles)}</h2></div><div class="card"><b>Saved items</b><h2>${number(totalSaved)}</h2></div></div><h2>Automated insights</h2>${insights.map(item => `<div class="card"><b>${item.title}</b><p>${item.text}</p></div>`).join('')}</body></html>`);
    report.document.close();
    report.focus();
    report.print();
  };

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div><span className="admin-eyebrow"><BarChart3 size={16} /> Build 73 Analytics</span><h1>Openvol Analytics</h1><p>Recent aggregate analytics combined with Openvol's historical engagement data.</p></div>
        <div className="admin-actions">
          <button onClick={load} disabled={status.loading}><RefreshCw size={17} className={status.loading ? 'spin' : ''} /> Refresh</button>
          <button onClick={exportAll}><Download size={17} /> Export CSV</button>
          <button onClick={printReport}><FileText size={17} /> Executive report</button>
          <button className="primary" onClick={onOpenSettings}><Settings size={17} /> Settings</button>
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="admin-range" aria-label="Analytics date range">{RANGE_OPTIONS.map(days => <button key={days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days} days</button>)}</div>
        <small>{status.refreshedAt ? `Updated ${status.refreshedAt.toLocaleTimeString()}` : 'Aggregate metrics only'}</small>
      </section>

      {status.error && <div className="admin-error"><strong>Recent analytics could not load.</strong><span>{status.error}</span></div>}

      <section className="admin-metrics">
        <MetricCard icon={<Activity />} label="Page views" value={totals.page_views} hint={`Last ${range} days`} />
        <MetricCard icon={<Search />} label="All-time searches" value={totalSearchesAllTime} hint="Historical + recent" />
        <MetricCard icon={<Users />} label="Student profiles" value={historicalTotals.student_profiles} hint="Historical total" />
        <MetricCard icon={<Bookmark />} label="Saved items" value={totalSaved} hint="Clinics + opportunities" />
      </section>

      <section className="admin-panel historical-panel">
        <div className="admin-panel-heading"><div><span>Historical database</span><h2>Legacy engagement records</h2></div><Activity size={22} /></div>
        <div className="historical-grid">{historical.map(item => <HistoricalCard key={item.table} item={item} />)}</div>
      </section>

      <section className="admin-executive-grid">
        <MetricCard icon={<CalendarDays />} label="Today" value={executive.todayViews} hint={`${percentChange(executive.todayViews, executive.yesterdayViews)}% vs yesterday`} />
        <MetricCard icon={<TrendingUp />} label="7-day views" value={executive.sevenDayViews} hint={`${number(executive.sevenDaySearches)} searches`} />
        <MetricCard icon={<Target />} label="Engagement rate" value={`${executive.engagement}%`} hint="Clicks per page view" />
        <MetricCard icon={<MessageSquare />} label="Feedback records" value={historicalTotals.website_feedback} hint="Historical total" />
      </section>

      <section className="admin-panel admin-insights-panel">
        <div className="admin-panel-heading"><div><span><Sparkles size={14} /> Build 73</span><h2>Automated insights</h2></div><TrendingUp size={22} /></div>
        <div className="admin-insights-grid">{insights.map(insight => <InsightCard key={insight.title} {...insight} />)}</div>
      </section>

      <section className="admin-panel admin-chart-panel">
        <div className="admin-panel-heading"><div><span>Traffic trend</span><h2>Daily activity</h2></div><TrendingUp size={22} /></div>
        <div className="admin-chart"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
      </section>

      <section className="admin-strategy-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><span>Historical funnel</span><h2>Student journey</h2></div><Target size={22} /></div>
          <div className="admin-funnel">
            <FunnelStep icon={<Activity size={18} />} label="Visitors" value={historicalTotals.visitors} percent={100} />
            <FunnelStep icon={<Search size={18} />} label="Search events" value={historicalTotals.search_events} percent={historicalTotals.visitors ? Math.round((historicalTotals.search_events / historicalTotals.visitors) * 100) : 0} />
            <FunnelStep icon={<Users size={18} />} label="Student profiles" value={historicalTotals.student_profiles} percent={historicalTotals.visitors ? Math.round((historicalTotals.student_profiles / historicalTotals.visitors) * 100) : 0} />
            <FunnelStep icon={<Bookmark size={18} />} label="Saved items" value={totalSaved} percent={historicalTotals.student_profiles ? Math.round((totalSaved / historicalTotals.student_profiles) * 100) : 0} />
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><span>Predictive outlook</span><h2>Next 7 days</h2></div><Sparkles size={22} /></div>
          <div className="admin-forecast"><strong>{forecast.direction}</strong><span>{number(forecast.projected)} projected page views</span><small>{forecast.confidence} confidence · based on recent aggregate activity</small></div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><span>Geographic analytics</span><h2>Demand signals</h2></div><MapPin size={22} /></div>
          {geographicSignals.length ? <div className="admin-signal-list">{geographicSignals.map(row => <div key={row.search_term}><span>{row.search_term}</span><b>{number(row.search_count)}</b></div>)}</div> : <p className="admin-empty">Location-based recent searches will appear here.</p>}
        </section>
      </section>

      <section className="admin-grid">
        <RankingTable title="Top pages" rows={pages.slice(0, 10)} labelKey="page_path" valueKey="view_count" emptyText="No page activity yet." />
        <RankingTable title="Top recent searches" rows={searches.slice(0, 10)} labelKey="search_term" valueKey="search_count" emptyText="No recent searches recorded yet." />
        <RankingTable title="Most-clicked clinics" rows={clinics.slice(0, 10)} labelKey="clinic_id" valueKey="click_count" emptyText="No clinic clicks recorded yet." />
        <RankingTable title="Most-clicked opportunities" rows={opportunities.slice(0, 10)} labelKey="opportunity_id" valueKey="click_count" emptyText="No opportunity clicks recorded yet." />
      </section>
    </main>
  );
}
