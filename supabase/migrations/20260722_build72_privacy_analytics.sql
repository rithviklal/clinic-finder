-- Build 72: privacy-first aggregate analytics
-- Stores counters only. No visitor IDs, emails, IP addresses, user agents,
-- exact location, referrers, or event-level browsing histories are stored.

create table if not exists public.analytics_daily (
  analytics_date date primary key default current_date,
  page_views bigint not null default 0,
  searches bigint not null default 0,
  clinic_clicks bigint not null default 0,
  opportunity_clicks bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_pages (
  analytics_date date not null default current_date,
  page_path text not null,
  view_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (analytics_date, page_path),
  constraint analytics_pages_path_length check (char_length(page_path) between 1 and 120)
);

create table if not exists public.analytics_searches (
  analytics_date date not null default current_date,
  search_term text not null,
  search_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (analytics_date, search_term),
  constraint analytics_searches_term_length check (char_length(search_term) between 1 and 80)
);

create table if not exists public.analytics_clinics (
  analytics_date date not null default current_date,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  click_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (analytics_date, clinic_id)
);

create table if not exists public.analytics_opportunities (
  analytics_date date not null default current_date,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  click_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (analytics_date, opportunity_id)
);

alter table public.analytics_daily enable row level security;
alter table public.analytics_pages enable row level security;
alter table public.analytics_searches enable row level security;
alter table public.analytics_clinics enable row level security;
alter table public.analytics_opportunities enable row level security;

-- No direct anonymous table access. The frontend can only call the narrow,
-- security-definer increment functions below. Admin reads should use an
-- authenticated service role or a future restricted admin policy.

create or replace function public.record_page_view(p_page_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  v_path := left(coalesce(nullif(trim(p_page_path), ''), '/'), 120);

  insert into public.analytics_daily (analytics_date, page_views, updated_at)
  values (current_date, 1, now())
  on conflict (analytics_date)
  do update set
    page_views = public.analytics_daily.page_views + 1,
    updated_at = now();

  insert into public.analytics_pages (analytics_date, page_path, view_count, updated_at)
  values (current_date, v_path, 1, now())
  on conflict (analytics_date, page_path)
  do update set
    view_count = public.analytics_pages.view_count + 1,
    updated_at = now();
end;
$$;

create or replace function public.record_search(p_search_term text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term text;
begin
  -- Normalize and limit the term so analytics remain aggregate and useful.
  v_term := left(lower(regexp_replace(trim(coalesce(p_search_term, '')), '\s+', ' ', 'g')), 80);

  if v_term = '' then
    return;
  end if;

  insert into public.analytics_daily (analytics_date, searches, updated_at)
  values (current_date, 1, now())
  on conflict (analytics_date)
  do update set
    searches = public.analytics_daily.searches + 1,
    updated_at = now();

  insert into public.analytics_searches (analytics_date, search_term, search_count, updated_at)
  values (current_date, v_term, 1, now())
  on conflict (analytics_date, search_term)
  do update set
    search_count = public.analytics_searches.search_count + 1,
    updated_at = now();
end;
$$;

create or replace function public.record_clinic_click(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_clinic_id is null then
    return;
  end if;

  insert into public.analytics_daily (analytics_date, clinic_clicks, updated_at)
  values (current_date, 1, now())
  on conflict (analytics_date)
  do update set
    clinic_clicks = public.analytics_daily.clinic_clicks + 1,
    updated_at = now();

  insert into public.analytics_clinics (analytics_date, clinic_id, click_count, updated_at)
  values (current_date, p_clinic_id, 1, now())
  on conflict (analytics_date, clinic_id)
  do update set
    click_count = public.analytics_clinics.click_count + 1,
    updated_at = now();
end;
$$;

create or replace function public.record_opportunity_click(p_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_opportunity_id is null then
    return;
  end if;

  insert into public.analytics_daily (analytics_date, opportunity_clicks, updated_at)
  values (current_date, 1, now())
  on conflict (analytics_date)
  do update set
    opportunity_clicks = public.analytics_daily.opportunity_clicks + 1,
    updated_at = now();

  insert into public.analytics_opportunities (analytics_date, opportunity_id, click_count, updated_at)
  values (current_date, p_opportunity_id, 1, now())
  on conflict (analytics_date, opportunity_id)
  do update set
    click_count = public.analytics_opportunities.click_count + 1,
    updated_at = now();
end;
$$;

revoke all on function public.record_page_view(text) from public;
revoke all on function public.record_search(text) from public;
revoke all on function public.record_clinic_click(uuid) from public;
revoke all on function public.record_opportunity_click(uuid) from public;

grant execute on function public.record_page_view(text) to anon, authenticated;
grant execute on function public.record_search(text) to anon, authenticated;
grant execute on function public.record_clinic_click(uuid) to anon, authenticated;
grant execute on function public.record_opportunity_click(uuid) to anon, authenticated;

comment on table public.analytics_daily is 'Daily aggregate Openvol traffic counters without visitor identifiers.';
comment on table public.analytics_pages is 'Daily aggregate page counts without event-level user histories.';
comment on table public.analytics_searches is 'Daily normalized search-term counts without visitor identifiers.';
comment on table public.analytics_clinics is 'Daily aggregate clinic outbound-click counts.';
comment on table public.analytics_opportunities is 'Daily aggregate opportunity outbound-click counts.';
