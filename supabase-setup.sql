-- Anton's Apartment Quest - optional private cloud backend
-- Run this in the Supabase SQL editor after creating the project.
-- IMPORTANT: create the parent and Anton users in Authentication first.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('parent','child')),
  created_at timestamptz not null default now()
);

create or replace function public.current_household()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null default public.current_household() references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household() references public.households(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  recipient_name text not null,
  thread text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.current_household() references public.households(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  text text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.messages enable row level security;
alter table public.wall_posts enable row level security;

create policy "profiles_same_household" on public.profiles for select
using (household_id = public.current_household());

create policy "save_self_or_parent_read" on public.game_saves for select
using (
  household_id = public.current_household()
  and (user_id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='parent'))
);
create policy "save_self_insert" on public.game_saves for insert
with check (user_id = auth.uid() and household_id = public.current_household());
create policy "save_self_update" on public.game_saves for update
using (user_id = auth.uid() and household_id = public.current_household())
with check (user_id = auth.uid() and household_id = public.current_household());

create policy "messages_household_read" on public.messages for select
using (household_id = public.current_household());
create policy "messages_household_insert" on public.messages for insert
with check (household_id = public.current_household() and sender_id = auth.uid());

create policy "wall_household_read" on public.wall_posts for select
using (household_id = public.current_household());
create policy "wall_parent_insert" on public.wall_posts for insert
with check (
  household_id = public.current_household()
  and author_id = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='parent')
);
create policy "wall_parent_update" on public.wall_posts for update
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='parent'));
create policy "wall_parent_delete" on public.wall_posts for delete
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='parent'));

-- AFTER you create the two Auth users, run something like this with their real UUIDs:
-- insert into public.households(name) values ('Apartment Quest Family') returning id;
-- insert into public.profiles(id, household_id, display_name, role) values
--   ('PARENT-AUTH-UUID','HOUSEHOLD-UUID','Papa','parent'),
--   ('ANTON-AUTH-UUID','HOUSEHOLD-UUID','Anton','child');
