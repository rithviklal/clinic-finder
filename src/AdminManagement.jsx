import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, ExternalLink, MessageSquare, RefreshCw, Search, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import './AdminManagement.css';

const TABS = [
  { key: 'students', label: 'Students', icon: Users },
  { key: 'clinics', label: 'Clinics', icon: Building2 },
  { key: 'opportunities', label: 'Opportunities', icon: ExternalLink },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare }
];

export default function AdminManagement({ onBack }) {
  const [tab, setTab] = useState('students');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ students: [], clinics: [], opportunities: [], feedback: [] });
  const [status, setStatus] = useState({ loading: true, error: '' });

  async function load() {
    setStatus({ loading: true, error: '' });
    const [students, clinics, opportunities, feedback] = await Promise.all([
      supabase.from('student_profiles').select('id,email,full_name,school_name,graduation_year,created_at').order('created_at', { ascending: false }).limit(250),
      supabase.from('clinics').select('id,clinic_name,city,county,active_status,availability_status,application_status,volunteer_url,website_url,updated_at').order('clinic_name').limit(250),
      supabase.from('opportunities').select('*').limit(250),
      supabase.from('website_feedback').select('*').limit(250)
    ]);
    const firstError = [students, clinics, opportunities, feedback].find(result => result.error)?.error;
    setData({
      students: students.data || [],
      clinics: clinics.data || [],
      opportunities: opportunities.data || [],
      feedback: feedback.data || []
    });
    setStatus({ loading: false, error: firstError?.message || '' });
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data[tab];
    return data[tab].filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(needle)));
  }, [data, query, tab]);

  return (
    <main className="management-page">
      <section className="management-hero">
        <div>
          <button className="management-back" onClick={onBack}><ArrowLeft size={17}/> Dashboard</button>
          <span>Build 73 Administration</span>
          <h1>Openvol Management</h1>
          <p>Review students, clinics, opportunities, and website feedback from one protected workspace.</p>
        </div>
        <button className="management-refresh" onClick={load} disabled={status.loading}><RefreshCw size={17}/> Refresh</button>
      </section>

      <section className="management-tabs">
        {TABS.map(item => {
          const Icon=item.icon;
          return <button key={item.key} className={tab===item.key?'active':''} onClick={()=>{setTab(item.key);setQuery('')}}><Icon size={17}/>{item.label}<b>{data[item.key].length}</b></button>;
        })}
      </section>

      <section className="management-toolbar">
        <div><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${tab}…`}/></div>
        <span>{rows.length} records shown</span>
      </section>

      {status.error && <div className="management-error">{status.error}</div>}
      {status.loading ? <div className="management-empty">Loading administration data…</div> : <ManagementTable tab={tab} rows={rows}/>}
    </main>
  );
}

function ManagementTable({ tab, rows }) {
  if (!rows.length) return <div className="management-empty">No records found.</div>;
  if (tab === 'students') return <Table headers={['Student','Email','School','Graduation','Created']} rows={rows.map(r=>[r.full_name||'Unnamed student',r.email,r.school_name||'—',r.graduation_year||'—',formatDate(r.created_at)])}/>;
  if (tab === 'clinics') return <Table headers={['Clinic','Location','Availability','Application','Active']} rows={rows.map(r=>[r.clinic_name,[r.city,r.county].filter(Boolean).join(', '),r.availability_status||'—',r.application_status||'—',r.active_status===false?'No':'Yes'])}/>;
  if (tab === 'opportunities') return <Table headers={['Opportunity','Organization','Location','Type','Status']} rows={rows.map(r=>[r.opportunity_name||r.title||'Untitled',r.organization_name||r.organization||'—',[r.city,r.county].filter(Boolean).join(', ')||'—',r.opportunity_type||r.opportunity_category||'—',r.application_status||r.availability_status||'—'])}/>;
  return <Table headers={['Feedback','Page','Rating','Contact','Created']} rows={rows.map(r=>[r.feedback_text||r.message||r.comments||r.feedback||'Feedback record',r.page_path||r.page_url||'—',r.rating||'—',r.email||'—',formatDate(r.created_at||r.submitted_at)])}/>;
}

function Table({ headers, rows }) {
  return <div className="management-table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{String(cell??'—')}</td>)}</tr>)}</tbody></table></div>;
}

function formatDate(value) {
  if (!value) return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleDateString();
}
