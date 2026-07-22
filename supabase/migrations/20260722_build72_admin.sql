-- Openvol Build 72.2 and 72.3
-- Secure admin analytics reads, settings, retention, and system health.
-- Run after the Build 72 privacy analytics migration.

begin;

create table if not exists public.openvol_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_openvol_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.openvol_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_openvol_admin() from public;
grant execute on function public.is_openvol_admin() to authenticated;

alter table public.openvol_admins enable row level security;
create policy "admins can read admin list"
on public.openvol_admins for select to authenticated
using (public.is_openvol_admin());

create policy "admin read analytics daily"
on public.analytics_daily for select to authenticated
using (public.is_openvol_admin());

create policy "admin read analytics pages"
on public.analytics_pages for select to authenticated
using (public.is_openvol_admin());

create policy "admin read analytics searches"
on public.analytics_searches for select to authenticated
using (public.is_openvol_admin());

create policy "admin read analytics clinics"
on public.analytics_clinics for select to authenticated
using (public.is_openvol_admin());

create policy "admin read analytics opportunities"
on public.analytics_opportunities for select to authenticated
using (public.is_openvol_admin());

grant select on public.analytics_daily to authenticated;
grant select on public.analytics_pages to authenticated;
grant select on public.analytics_searches to authenticated;
grant select on public.analytics_clinics to authenticated;
grant select on public.analytics_opportunities to authenticated;

create table if not exists public.admin_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.admin_settings enable row level security;

create policy "admins read settings"
on public.admin_settings for select to authenticated
using (public.is_openvol_admin());

create policy "admins insert settings"
on public.admin_settings for insert to authenticated
with check (public.is_openvol_admin());

create policy "admins update settings"
on public.admin_settings for update to authenticated
using (public.is_openvol_admin())
with check (public.is_openvol_admin());

grant select, insert, update on public.admin_settings to authenticated;

insert into public.admin_settings(setting_key, setting_value)
values
 ('analytics_retention_days', '365'::jsonb),
 ('maintenance_mode', 'false'::jsonb),
 ('cloud_sync_enabled', 'false'::jsonb),
 ('ai_insights_enabled', 'false'::jsonb),
 ('build_label', '"Build 72"'::jsonb),
 ('support_email', '""'::jsonb)
on conflict (setting_key) do nothing;

create or replace function public.purge_expired_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  retention_days integer;
  cutoff date;
begin
  if not public.is_openvol_admin() then
    raise exception 'Admin access required';
  end if;

  select greatest(30, least(3650, coalesce((setting_value #>> '{}')::integer, 365)))
    into retention_days
  from public.admin_settings
  where setting_key = 'analytics_retention_days';

  cutoff := current_date - coalesce(retention_days, 365);

  delete from public.analytics_pages where analytics_date < cutoff;
  delete from public.analytics_searches where analytics_date < cutoff;
  delete from public.analytics_clinics where analytics_date < cutoff;
  delete from public.analytics_opportunities where analytics_date < cutoff;
  delete from public.analytics_daily where analytics_date < cutoff;

  return jsonb_build_object('status', 'ok', 'cutoff', cutoff);
end;
$$;

revoke all on function public.purge_expired_analytics() from public;
grant execute on function public.purge_expired_analytics() to authenticated;

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  build_name text;
begin
  if not public.is_openvol_admin() then
    raise exception 'Admin access required';
  end if;

  select setting_value #>> '{}' into build_name
  from public.admin_settings where setting_key = 'build_label';

  return jsonb_build_object(
    'database', 'Healthy',
    'analytics', case when to_regclass('public.analytics_daily') is not null then 'Ready' else 'Unavailable' end,
    'version', coalesce(build_name, 'Build 72')
  );
end;
$$;

revoke all on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;

commit;

-- IMPORTANT: after creating an authenticated Supabase user for yourself,
-- run this once in the SQL editor, replacing the email:
--
-- insert into public.openvol_admins(user_id)
-- select id from auth.users where email = 'YOUR-ADMIN-EMAIL';
