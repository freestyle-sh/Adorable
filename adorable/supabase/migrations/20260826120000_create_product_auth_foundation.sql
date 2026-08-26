create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_infrastructure_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  freestyle_identity_id text not null unique,
  created_at timestamptz not null default now(),
  last_validated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  wrapper_repo_id text not null unique,
  source_repo_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index projects_owner_user_id_idx
  on public.projects(owner_user_id);

create index projects_owner_wrapper_repo_id_idx
  on public.projects(owner_user_id, wrapper_repo_id);

create index projects_owner_source_repo_id_idx
  on public.projects(owner_user_id, source_repo_id);

alter table public.profiles enable row level security;
alter table public.user_infrastructure_identities enable row level security;
alter table public.projects enable row level security;

create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can view their own infrastructure identity"
  on public.user_infrastructure_identities
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own infrastructure identity"
  on public.user_infrastructure_identities
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own infrastructure identity"
  on public.user_infrastructure_identities
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own projects"
  on public.projects
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "Users can create their own projects"
  on public.projects
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

create policy "Users can update their own projects"
  on public.projects
  for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
