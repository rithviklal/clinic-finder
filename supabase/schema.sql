create extension if not exists pgcrypto;

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  city text not null,
  county text,
  address text,
  phone text,
  website_url text,
  volunteer_url text,
  minimum_age int,
  volunteer_type text,
  requirements text,
  notes text,
  active_status boolean default true,
  latitude numeric,
  longitude numeric,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_visitor_id text unique not null,
  first_visit_at timestamptz default now(),
  last_visit_at timestamptz default now(),
  visit_count int default 1,
  user_agent text
);

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade,
  page_url text not null,
  clinic_id uuid references clinics(id) on delete set null,
  viewed_at timestamptz default now()
);

create table if not exists clinic_link_clicks (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete cascade,
  clicked_url text not null,
  clicked_at timestamptz default now(),
  device_type text,
  browser text
);

create table if not exists search_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade,
  search_text text,
  city_filter text,
  county_filter text,
  minimum_age_filter int,
  created_at timestamptz default now()
);

alter table clinics enable row level security;
alter table visitors enable row level security;
alter table page_views enable row level security;
alter table clinic_link_clicks enable row level security;
alter table search_events enable row level security;

create policy "public read clinics" on clinics for select using (active_status = true);
create policy "public insert visitors" on visitors for insert with check (true);
create policy "public update visitors" on visitors for update using (true);
create policy "public read visitors" on visitors for select using (true);
create policy "public insert page views" on page_views for insert with check (true);
create policy "public read page views" on page_views for select using (true);
create policy "public insert clinic clicks" on clinic_link_clicks for insert with check (true);
create policy "public read clinic clicks" on clinic_link_clicks for select using (true);
create policy "public insert searches" on search_events for insert with check (true);
create policy "public read searches" on search_events for select using (true);
