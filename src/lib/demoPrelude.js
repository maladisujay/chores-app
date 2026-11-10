// Minimal stand-ins for Supabase's `auth` schema and roles so the exact same
// schema.sql runs inside PGlite (Postgres compiled to WASM) for demo mode & tests.
export const DEMO_PRELUDE = `
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;
create table if not exists public.demo_storage (path text primary key, data text not null, created_at timestamptz default now());
`
