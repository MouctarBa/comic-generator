-- ============================================================================
-- Comic Generator — Database Schema (Supabase / Postgres)
-- Run this in the Supabase SQL Editor to create all tables + RLS policies
-- ============================================================================

-- 1) TABLES
-- --------------------------------------------------------------------------

-- projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anonymous',
  title text not null default 'Untitled Comic',
  story_prompt text not null,
  template_json jsonb null,
  provider_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- assets
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  url text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- storyboards
create table if not exists storyboards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  storyboard_json jsonb not null,
  created_at timestamptz not null default now()
);

-- panels
create table if not exists panels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  page_num int not null,
  panel_num int not null,
  global_index int not null,
  prompt text not null,
  dialogue_json jsonb not null default '[]'::jsonb,
  must_keep_json jsonb not null default '[]'::jsonb,
  image_asset_id uuid null references assets(id) on delete set null,
  status text not null default 'pending',
  regen_count int not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, global_index)
);

-- jobs
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts int not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) INDEXES
-- --------------------------------------------------------------------------
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_panels_project on panels(project_id, global_index);
create index if not exists idx_assets_project on assets(project_id);

-- 3) ROW LEVEL SECURITY
-- --------------------------------------------------------------------------

alter table projects enable row level security;
alter table assets enable row level security;
alter table storyboards enable row level security;
alter table panels enable row level security;
alter table jobs enable row level security;

-- projects
create policy "projects_select_own" on projects for select
  using (user_id = (auth.uid())::text);

create policy "projects_insert_own" on projects for insert
  with check (user_id = (auth.uid())::text);

create policy "projects_update_own" on projects for update
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "projects_delete_own" on projects for delete
  using (user_id = (auth.uid())::text);

-- assets
create policy "assets_select_own_project" on assets for select
  using (exists (
    select 1 from projects p where p.id = assets.project_id and p.user_id = (auth.uid())::text
  ));

create policy "assets_insert_own_project" on assets for insert
  with check (exists (
    select 1 from projects p where p.id = assets.project_id and p.user_id = (auth.uid())::text
  ));

create policy "assets_update_own_project" on assets for update
  using (exists (
    select 1 from projects p where p.id = assets.project_id and p.user_id = (auth.uid())::text
  ))
  with check (exists (
    select 1 from projects p where p.id = assets.project_id and p.user_id = (auth.uid())::text
  ));

create policy "assets_delete_own_project" on assets for delete
  using (exists (
    select 1 from projects p where p.id = assets.project_id and p.user_id = (auth.uid())::text
  ));

-- storyboards
create policy "storyboards_select_own_project" on storyboards for select
  using (exists (
    select 1 from projects p where p.id = storyboards.project_id and p.user_id = (auth.uid())::text
  ));

create policy "storyboards_insert_own_project" on storyboards for insert
  with check (exists (
    select 1 from projects p where p.id = storyboards.project_id and p.user_id = (auth.uid())::text
  ));

create policy "storyboards_update_own_project" on storyboards for update
  using (exists (
    select 1 from projects p where p.id = storyboards.project_id and p.user_id = (auth.uid())::text
  ))
  with check (exists (
    select 1 from projects p where p.id = storyboards.project_id and p.user_id = (auth.uid())::text
  ));

-- panels
create policy "panels_select_own_project" on panels for select
  using (exists (
    select 1 from projects p where p.id = panels.project_id and p.user_id = (auth.uid())::text
  ));

create policy "panels_insert_own_project" on panels for insert
  with check (exists (
    select 1 from projects p where p.id = panels.project_id and p.user_id = (auth.uid())::text
  ));

create policy "panels_update_own_project" on panels for update
  using (exists (
    select 1 from projects p where p.id = panels.project_id and p.user_id = (auth.uid())::text
  ))
  with check (exists (
    select 1 from projects p where p.id = panels.project_id and p.user_id = (auth.uid())::text
  ));

-- jobs
create policy "jobs_select_own_project" on jobs for select
  using (exists (
    select 1 from projects p where p.id = jobs.project_id and p.user_id = (auth.uid())::text
  ));

create policy "jobs_insert_own_project" on jobs for insert
  with check (exists (
    select 1 from projects p where p.id = jobs.project_id and p.user_id = (auth.uid())::text
  ));

-- 4) STORAGE BUCKET
-- --------------------------------------------------------------------------
-- Run in Supabase Dashboard > Storage or via SQL:
-- insert into storage.buckets (id, name, public) values ('comic', 'comic', true);
