-- LISBOA EVENTOS: esquema inicial seguro para PostgreSQL/Supabase.
-- Revise e execute no SQL Editor do NOVO projeto antes de integrar a interface.
create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_id text not null unique,
  name text not null,
  discord text not null default '',
  whatsapp text not null default '',
  eqpg text not null default '',
  role text not null default 'Treinamento' check (role in ('Treinamento','Aprendiz','Analista','Especialista','Supervisor','Responsável','Responsável Geral')),
  status text not null default 'Ativo' check (status in ('Ativo','Inativo','Suspenso','Afastado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Normal',
  event_date date not null,
  event_time time not null,
  staff1 text not null default '', staff2 text not null default '', staff3 text not null default '',
  treiner1 text not null default '', treiner2 text not null default '', treiner3 text not null default '',
  winner_id text not null default '', winner_discord text not null default '',
  status text not null default 'Concluído', notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.team_goals (
  id uuid primary key default gen_random_uuid(), title text not null,
  target integer not null check (target > 0), current integer not null default 0 check (current >= 0),
  owner text not null default 'Equipe', created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null, available_date date not null, start_time time not null, end_time time not null,
  notes text not null default '', created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(), name text not null, event_date date not null,
  event_time time not null, notes text not null default '', created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(), action text not null, detail text not null default '',
  actor_id uuid references auth.users(id) on delete set null, actor_name text not null default '',
  created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Helper functions are isolated from the exposed API schema to avoid RLS recursion.
create or replace function private.current_staff_role()
returns text language sql stable security definer
set search_path = '' as $$
  select role from public.staff_profiles where user_id = (select auth.uid()) and status = 'Ativo' limit 1;
$$;
revoke all on function private.current_staff_role() from public, anon;
grant execute on function private.current_staff_role() to authenticated;

create or replace function private.is_staff_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select coalesce(private.current_staff_role() in ('Supervisor','Responsável','Responsável Geral'), false);
$$;
revoke all on function private.is_staff_admin() from public, anon;
grant execute on function private.is_staff_admin() to authenticated;

alter table public.staff_profiles enable row level security;
alter table public.events enable row level security;
alter table public.team_goals enable row level security;
alter table public.availability enable row level security;
alter table public.schedules enable row level security;
alter table public.activity_logs enable row level security;

-- Staff ativo pode consultar diretório. Só administradores podem editar perfis.
drop policy if exists "active staff can read profiles" on public.staff_profiles;
create policy "active staff can read profiles" on public.staff_profiles for select to authenticated
using (exists (select 1 from public.staff_profiles me where me.user_id = (select auth.uid()) and me.status = 'Ativo'));
drop policy if exists "users can create own profile" on public.staff_profiles;
create policy "users can create own profile" on public.staff_profiles for insert to authenticated
with check (user_id = (select auth.uid()) and role = 'Treinamento' and status = 'Ativo');
drop policy if exists "admins update profiles" on public.staff_profiles;
create policy "admins update profiles" on public.staff_profiles for update to authenticated
using (private.is_staff_admin()) with check (private.is_staff_admin());
drop policy if exists "admins delete profiles" on public.staff_profiles;
create policy "admins delete profiles" on public.staff_profiles for delete to authenticated
using (private.is_staff_admin());

-- Eventos e cronograma: membros ativos leem; administradores escrevem.
drop policy if exists "active staff read events" on public.events;
create policy "active staff read events" on public.events for select to authenticated
using (exists (select 1 from public.staff_profiles me where me.user_id = (select auth.uid()) and me.status = 'Ativo'));
drop policy if exists "admins manage events" on public.events;
create policy "admins manage events" on public.events for all to authenticated
using (private.is_staff_admin()) with check (private.is_staff_admin());

drop policy if exists "active staff read goals" on public.team_goals;
create policy "active staff read goals" on public.team_goals for select to authenticated
using (exists (select 1 from public.staff_profiles me where me.user_id = (select auth.uid()) and me.status = 'Ativo'));
drop policy if exists "admins manage goals" on public.team_goals;
create policy "admins manage goals" on public.team_goals for all to authenticated
using (private.is_staff_admin()) with check (private.is_staff_admin());

drop policy if exists "active staff read availability" on public.availability;
create policy "active staff read availability" on public.availability for select to authenticated
using (exists (select 1 from public.staff_profiles me where me.user_id = (select auth.uid()) and me.status = 'Ativo'));
drop policy if exists "users create own availability" on public.availability;
create policy "users create own availability" on public.availability for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "owner or admin delete availability" on public.availability;
create policy "owner or admin delete availability" on public.availability for delete to authenticated
using (user_id = (select auth.uid()) or private.is_staff_admin());

drop policy if exists "active staff read schedules" on public.schedules;
create policy "active staff read schedules" on public.schedules for select to authenticated
using (exists (select 1 from public.staff_profiles me where me.user_id = (select auth.uid()) and me.status = 'Ativo'));
drop policy if exists "admins manage schedules" on public.schedules;
create policy "admins manage schedules" on public.schedules for all to authenticated
using (private.is_staff_admin()) with check (private.is_staff_admin());

drop policy if exists "admins read logs" on public.activity_logs;
create policy "admins read logs" on public.activity_logs for select to authenticated
using (private.is_staff_admin());
drop policy if exists "active staff insert logs" on public.activity_logs;
create policy "active staff insert logs" on public.activity_logs for insert to authenticated
with check (actor_id = (select auth.uid()));

-- Não há política para anon: o cadastro e as consultas exigem sessão autenticada.
