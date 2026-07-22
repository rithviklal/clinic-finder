-- Openvol Build 72 Privacy Analytics Migration

begin;

create table if not exists analytics_daily(
 analytics_date date primary key default current_date,
 page_views bigint default 0,
 searches bigint default 0,
 clinic_clicks bigint default 0,
 opportunity_clicks bigint default 0,
 updated_at timestamptz default now()
);

create table if not exists analytics_pages(
 analytics_date date default current_date,
 page_path text,
 view_count bigint default 0,
 updated_at timestamptz default now(),
 primary key(analytics_date,page_path)
);

create table if not exists analytics_searches(
 analytics_date date default current_date,
 search_term text,
 search_count bigint default 0,
 updated_at timestamptz default now(),
 primary key(analytics_date,search_term)
);

create table if not exists analytics_clinics(
 analytics_date date default current_date,
 clinic_id text,
 click_count bigint default 0,
 updated_at timestamptz default now(),
 primary key(analytics_date,clinic_id)
);

create table if not exists analytics_opportunities(
 analytics_date date default current_date,
 opportunity_id text,
 click_count bigint default 0,
 updated_at timestamptz default now(),
 primary key(analytics_date,opportunity_id)
);

create or replace function record_page_view(p_page_path text)
returns void language plpgsql security definer as $$
begin
 insert into analytics_daily(analytics_date,page_views)
 values(current_date,1)
 on conflict(analytics_date)
 do update set page_views=analytics_daily.page_views+1,updated_at=now();

 insert into analytics_pages(analytics_date,page_path,view_count)
 values(current_date,left(coalesce(nullif(trim(p_page_path),''),'/'),120),1)
 on conflict(analytics_date,page_path)
 do update set view_count=analytics_pages.view_count+1,updated_at=now();
end;
$$;

create or replace function record_search(p_search_term text)
returns void language plpgsql security definer as $$
declare t text;
begin
 t:=left(lower(regexp_replace(trim(coalesce(p_search_term,'')),'\s+',' ','g')),80);
 if t='' then return; end if;
 insert into analytics_daily(analytics_date,searches)
 values(current_date,1)
 on conflict(analytics_date)
 do update set searches=analytics_daily.searches+1,updated_at=now();
 insert into analytics_searches(analytics_date,search_term,search_count)
 values(current_date,t,1)
 on conflict(analytics_date,search_term)
 do update set search_count=analytics_searches.search_count+1,updated_at=now();
end;
$$;

create or replace function record_clinic_click(p_clinic_id text)
returns void language plpgsql security definer as $$
begin
 if trim(coalesce(p_clinic_id,''))='' then return; end if;
 insert into analytics_daily(analytics_date,clinic_clicks)
 values(current_date,1)
 on conflict(analytics_date)
 do update set clinic_clicks=analytics_daily.clinic_clicks+1,updated_at=now();
 insert into analytics_clinics values(current_date,left(trim(p_clinic_id),100),1,now())
 on conflict(analytics_date,clinic_id)
 do update set click_count=analytics_clinics.click_count+1,updated_at=now();
end;
$$;

create or replace function record_opportunity_click(p_opportunity_id text)
returns void language plpgsql security definer as $$
begin
 if trim(coalesce(p_opportunity_id,''))='' then return; end if;
 insert into analytics_daily(analytics_date,opportunity_clicks)
 values(current_date,1)
 on conflict(analytics_date)
 do update set opportunity_clicks=analytics_daily.opportunity_clicks+1,updated_at=now();
 insert into analytics_opportunities values(current_date,left(trim(p_opportunity_id),100),1,now())
 on conflict(analytics_date,opportunity_id)
 do update set click_count=analytics_opportunities.click_count+1,updated_at=now();
end;
$$;

commit;
