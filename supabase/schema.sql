-- =====================================================================
-- Personal Project Tracker - Supabase schema + security
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It never deletes or overwrites rows. Re-running is safe: tables use
-- "if not exists", functions are replaced, policies are recreated.
-- =====================================================================

-- ---------- helper functions ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Ownership can never be changed after a row is created.
create or replace function public.prevent_ownership_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- links must be a JSON array (max 50) of objects with a title and an http(s) url.
create or replace function public.links_are_valid(l jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case
    when jsonb_typeof(l) <> 'array' then false
    else jsonb_array_length(l) <= 50
      and not exists (
        select 1 from jsonb_array_elements(l) e
        where jsonb_typeof(e) <> 'object'
           or coalesce(btrim(e->>'title'), '') = ''
           or coalesce(e->>'url', '') !~* '^https?://'
      )
  end;
$$;

-- ---------- topics ----------
create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint topics_title_length check (char_length(btrim(title)) between 1 and 80),
  constraint topics_description_length check (char_length(description) <= 500),
  -- lets projects reference (topic, owner) together, so a project can never
  -- point at another user's topic
  constraint topics_id_user_unique unique (id, user_id)
);

-- one title per user, ignoring case and surrounding spaces
create unique index if not exists topics_user_title_unique
  on public.topics (user_id, lower(btrim(title)));

-- ---------- projects ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id    uuid not null,
  title       text not null,
  description text not null default '',
  caption     text not null default '',
  technologies text[] not null default '{}',
  status      text not null default 'Planned',
  links       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Default NO ACTION: a topic cannot be deleted while it still has projects.
  constraint projects_topic_owner_fk
    foreign key (topic_id, user_id) references public.topics (id, user_id),
  constraint projects_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint projects_description_length check (char_length(description) <= 2000),
  constraint projects_caption_length check (char_length(caption) <= 160),
  constraint projects_status_valid check (status in ('Planned', 'In Progress', 'Completed')),
  constraint projects_technologies_count check (cardinality(technologies) <= 30),
  constraint projects_links_valid check (public.links_are_valid(links))
);

create index if not exists projects_topic_id_idx on public.projects (topic_id);
create index if not exists projects_user_created_idx on public.projects (user_id, created_at desc);

-- ---------- triggers ----------
drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at before update on public.topics
  for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
drop trigger if exists topics_no_owner_change on public.topics;
create trigger topics_no_owner_change before update on public.topics
  for each row execute function public.prevent_ownership_change();
drop trigger if exists projects_no_owner_change on public.projects;
create trigger projects_no_owner_change before update on public.projects
  for each row execute function public.prevent_ownership_change();

-- ---------- Row Level Security ----------
alter table public.topics   enable row level security;
alter table public.projects enable row level security;

drop policy if exists "topics_select_own" on public.topics;
drop policy if exists "topics_insert_own" on public.topics;
drop policy if exists "topics_update_own" on public.topics;
drop policy if exists "topics_delete_own" on public.topics;
create policy "topics_select_own" on public.topics for select to authenticated
  using (user_id = (select auth.uid()));
create policy "topics_insert_own" on public.topics for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "topics_update_own" on public.topics for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "topics_delete_own" on public.topics for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_select_own" on public.projects for select to authenticated
  using (user_id = (select auth.uid()));
create policy "projects_insert_own" on public.projects for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "projects_update_own" on public.projects for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "projects_delete_own" on public.projects for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Grants (least privilege) ----------
-- Signed-out visitors (anon) get nothing. Signed-in users get only the columns
-- they should write: id, user_id, created_at and updated_at are set by the database.
revoke all on public.topics   from anon, public;
revoke all on public.projects from anon, public;

grant select, delete on public.topics   to authenticated;
grant select, delete on public.projects to authenticated;

grant insert (title, description) on public.topics to authenticated;
grant update (title, description) on public.topics to authenticated;

grant insert (topic_id, title, description, caption, technologies, status, links) on public.projects to authenticated;
grant update (topic_id, title, description, caption, technologies, status, links) on public.projects to authenticated;

-- ---------- Optional checks (run separately; read-only) ----------
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1, 2;
