-- ============================================================================
--  Chores — roommate chore tracker
--  Run this whole file once in Supabase → SQL Editor → New query → Run.
--  It is idempotent: re-running it upgrades functions/policies in place.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.houses (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 40),
  code             text not null unique,
  is_open          boolean not null default true,
  photo_required   boolean not null default false,
  vote_window_days int not null default 7 check (vote_window_days between 1 and 60),
  week_start       int not null default 1 check (week_start in (0, 1)),
  created_at       timestamptz not null default now()
);

create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 24),
  color       text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  role        text not null default 'member' check (role in ('owner', 'member')),
  status      text not null default 'active' check (status in ('active', 'removed')),
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists members_name_uq  on public.members (house_id, lower(name)) where status = 'active';
create unique index if not exists members_color_uq on public.members (house_id, upper(color)) where status = 'active' and color is not null;
create index if not exists members_house_idx on public.members (house_id);

-- PIN secrets live in their own table with NO select policy, so housemates can
-- never read each other's hashes through the API.
create table if not exists public.member_secrets (
  member_id       uuid primary key references public.members(id) on delete cascade,
  pin_salt        text not null,
  pin_hash        text not null,
  failed_attempts int not null default 0,
  locked_until    timestamptz
);

-- A member can be signed in on several devices (phone browser, home-screen app…).
create table if not exists public.member_devices (
  user_id    uuid not null,
  member_id  uuid not null references public.members(id) on delete cascade,
  house_id   uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, member_id)
);
create unique index if not exists member_devices_one_per_house on public.member_devices (user_id, house_id);

create table if not exists public.sections (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid not null references public.houses(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 30),
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid not null references public.houses(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  name       text not null check (char_length(name) between 1 and 40),
  icon       text not null default 'other',
  points     int not null default 10 check (points between 0 and 1000),
  position   int not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_house_idx on public.tasks (house_id);

create table if not exists public.logs (
  id            uuid primary key default gen_random_uuid(),
  house_id      uuid not null references public.houses(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  task_id       uuid references public.tasks(id) on delete set null,
  task_name     text not null,
  task_icon     text not null default 'other',
  points        int not null check (points between 0 and 1000),
  done_at       timestamptz not null,
  note          text check (note is null or char_length(note) <= 280),
  before_path   text,
  after_path    text,
  logged_by     uuid references public.members(id) on delete set null,
  voided        boolean not null default false,
  voided_at     timestamptz,
  vote_override boolean not null default false,
  edited_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists logs_house_done_idx on public.logs (house_id, done_at desc);

create table if not exists public.log_votes (
  log_id     uuid not null references public.logs(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  house_id   uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (log_id, member_id)
);

create table if not exists public.change_requests (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references public.houses(id) on delete cascade,
  log_id      uuid references public.logs(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  kind        text not null check (kind in ('edit', 'delete')),
  payload     jsonb not null default '{}'::jsonb,
  reason      text check (reason is null or char_length(reason) <= 280),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists change_requests_one_pending on public.change_requests (log_id) where status = 'pending';
create index if not exists change_requests_house_idx on public.change_requests (house_id, status);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_house uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from member_devices d join members m on m.id = d.member_id
    where d.house_id = p_house and d.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_member_folder(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  begin v := split_part(p_name, '/', 1)::uuid; exception when others then return false; end;
  return public.is_member(v);
end $$;

create or replace function public.is_owner_folder(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  begin v := split_part(p_name, '/', 1)::uuid; exception when others then return false; end;
  return exists (
    select 1 from member_devices d join members m on m.id = d.member_id
    where d.house_id = v and d.user_id = auth.uid() and m.status = 'active' and m.role = 'owner'
  );
end $$;

-- Returns the caller's member row for a house or raises NOT_MEMBER.
create or replace function public._me(p_house uuid)
returns public.members language plpgsql stable security definer set search_path = public as $$
declare v public.members;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select m.* into v from member_devices d join members m on m.id = d.member_id
   where d.house_id = p_house and d.user_id = auth.uid() and m.status = 'active';
  if not found then raise exception 'NOT_MEMBER'; end if;
  return v;
end $$;

create or replace function public._owner(p_house uuid)
returns public.members language plpgsql stable security definer set search_path = public as $$
declare v public.members;
begin
  v := public._me(p_house);
  if v.role <> 'owner' then raise exception 'OWNER_ONLY'; end if;
  return v;
end $$;

create or replace function public._hash_pin(p_salt text, p_pin text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(p_salt || ':' || p_pin, 'UTF8')), 'hex');
$$;

create or replace function public._check_pin(p_pin text)
returns void language plpgsql immutable as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'BAD_PIN'; end if;
end $$;

create or replace function public._set_pin(p_member uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_salt text := replace(gen_random_uuid()::text, '-', '');
begin
  perform public._check_pin(p_pin);
  insert into member_secrets (member_id, pin_salt, pin_hash)
  values (p_member, v_salt, public._hash_pin(v_salt, p_pin))
  on conflict (member_id) do update
    set pin_salt = excluded.pin_salt, pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
end $$;

create or replace function public._check_color(p_color text)
returns void language plpgsql immutable as $$
begin
  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'BAD_COLOR'; end if;
end $$;

create or replace function public._clean(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '');
$$;

create or replace function public._new_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v text;
begin
  loop
    v := '';
    for i in 1..6 loop
      v := v || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from houses where code = v);
  end loop;
  return v;
end $$;

create or replace function public._check_path(p_house uuid, p_path text)
returns void language plpgsql immutable as $$
begin
  if p_path is not null and (p_path not like p_house::text || '/%' or p_path like '%..%') then
    raise exception 'BAD_PHOTO';
  end if;
end $$;

-- Accepts a JSON payload and validates a done_at for non-owners.
create or replace function public._check_done_at(p_done timestamptz, p_owner boolean)
returns void language plpgsql stable as $$
begin
  if p_done is null then raise exception 'BAD_DATE'; end if;
  if p_done > now() + interval '10 minutes' then raise exception 'FUTURE_DATE'; end if;
  if not p_owner and p_done < now() - interval '30 days' then raise exception 'TOO_OLD'; end if;
end $$;

create or replace function public._active_count(p_house uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from members where house_id = p_house and status = 'active';
$$;

-- Members who have actually joined (can vote).
create or replace function public._voter_count(p_house uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from members where house_id = p_house and status = 'active' and claimed_at is not null;
$$;

-- ---------------------------------------------------------------------------
-- Houses: create / preview / join / rejoin
-- ---------------------------------------------------------------------------
-- p_setup: { members: ["Alex","Sam"], sections: [{ name, tasks: [{ name, icon, points }] }],
--            loose_tasks: [{ name, icon, points }] }
create or replace function public.create_house(
  p_name text, p_owner_name text, p_owner_color text, p_pin text,
  p_photo_required boolean default false, p_is_open boolean default true,
  p_setup jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_house uuid; v_owner uuid; v_sec uuid; s jsonb; t jsonb; n text;
  v_spos int := 0; v_tpos int := 0;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
  if _clean(p_owner_name) is null then raise exception 'NAME_REQUIRED'; end if;
  perform _check_color(p_owner_color);
  perform _check_pin(p_pin);
  if (select count(*) from member_devices where user_id = auth.uid()) >= 10 then
    raise exception 'TOO_MANY_HOUSES';
  end if;

  insert into houses (name, code, photo_required, is_open)
  values (left(_clean(p_name), 40), _new_code(), coalesce(p_photo_required, false), coalesce(p_is_open, true))
  returning id into v_house;

  insert into members (house_id, name, color, role, claimed_at)
  values (v_house, left(_clean(p_owner_name), 24), upper(p_owner_color), 'owner', now())
  returning id into v_owner;
  perform _set_pin(v_owner, p_pin);
  insert into member_devices (user_id, member_id, house_id) values (auth.uid(), v_owner, v_house);

  for n in select _clean(x) from jsonb_array_elements_text(coalesce(p_setup->'members', '[]'::jsonb)) x loop
    if n is not null and not exists (
      select 1 from members where house_id = v_house and lower(name) = lower(left(n, 24)) and status = 'active'
    ) then
      insert into members (house_id, name) values (v_house, left(n, 24));
    end if;
  end loop;

  for t in select * from jsonb_array_elements(coalesce(p_setup->'loose_tasks', '[]'::jsonb)) loop
    if _clean(t->>'name') is not null then
      insert into tasks (house_id, name, icon, points, position)
      values (v_house, left(_clean(t->>'name'), 40), coalesce(t->>'icon', 'other'),
              greatest(0, least(1000, coalesce((t->>'points')::int, 10))), v_tpos);
      v_tpos := v_tpos + 1;
    end if;
  end loop;

  for s in select * from jsonb_array_elements(coalesce(p_setup->'sections', '[]'::jsonb)) loop
    if _clean(s->>'name') is not null then
      insert into sections (house_id, name, position) values (v_house, left(_clean(s->>'name'), 30), v_spos)
      returning id into v_sec;
      v_spos := v_spos + 1;
      for t in select * from jsonb_array_elements(coalesce(s->'tasks', '[]'::jsonb)) loop
        if _clean(t->>'name') is not null then
          insert into tasks (house_id, section_id, name, icon, points, position)
          values (v_house, v_sec, left(_clean(t->>'name'), 40), coalesce(t->>'icon', 'other'),
                  greatest(0, least(1000, coalesce((t->>'points')::int, 10))), v_tpos);
          v_tpos := v_tpos + 1;
        end if;
      end loop;
    end if;
  end loop;

  return v_house;
end $$;

create or replace function public.preview_house(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h houses;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into h from houses where code = upper(btrim(p_code));
  if not found then raise exception 'HOUSE_NOT_FOUND'; end if;
  return jsonb_build_object(
    'id', h.id, 'name', h.name, 'is_open', h.is_open,
    'already_member', public.is_member(h.id),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'color', m.color, 'role', m.role,
        'claimed', m.claimed_at is not null
      ) order by m.created_at)
      from members m where m.house_id = h.id and m.status = 'active'
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.join_house(
  p_code text, p_member uuid, p_name text, p_color text, p_pin text
) returns uuid language plpgsql security definer set search_path = public as $$
declare h houses; m members; v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into h from houses where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'HOUSE_NOT_FOUND'; end if;
  if public.is_member(h.id) then return h.id; end if;
  if not h.is_open then raise exception 'HOUSE_CLOSED'; end if;
  perform _check_color(p_color);
  perform _check_pin(p_pin);
  if exists (select 1 from members where house_id = h.id and status = 'active' and upper(color) = upper(p_color)
             and id is distinct from p_member) then
    raise exception 'COLOR_TAKEN';
  end if;
  -- stale device link from a removed membership
  delete from member_devices where user_id = auth.uid() and house_id = h.id;

  if p_member is not null then
    select * into m from members where id = p_member and house_id = h.id and status = 'active' for update;
    if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
    if m.claimed_at is not null then raise exception 'ALREADY_CLAIMED'; end if;
    update members set color = upper(p_color), claimed_at = now(),
           name = coalesce(left(_clean(p_name), 24), name)
     where id = m.id;
    v_id := m.id;
  else
    if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
    if exists (select 1 from members where house_id = h.id and status = 'active' and lower(name) = lower(left(_clean(p_name), 24))) then
      raise exception 'NAME_TAKEN';
    end if;
    if _active_count(h.id) >= 30 then raise exception 'HOUSE_FULL'; end if;
    insert into members (house_id, name, color, claimed_at)
    values (h.id, left(_clean(p_name), 24), upper(p_color), now()) returning id into v_id;
  end if;
  perform _set_pin(v_id, p_pin);
  insert into member_devices (user_id, member_id, house_id) values (auth.uid(), v_id, h.id);
  return h.id;
end $$;

-- Sign in on another device (or the home-screen app) with code + name + PIN.
-- Works even when the house is closed to new members.
create or replace function public.rejoin_house(p_code text, p_member uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h houses; m members; s member_secrets;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into h from houses where code = upper(btrim(p_code));
  if not found then raise exception 'HOUSE_NOT_FOUND'; end if;
  select * into m from members where id = p_member and house_id = h.id and status = 'active';
  if not found or m.claimed_at is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  select * into s from member_secrets where member_id = m.id for update;
  if not found then raise exception 'NO_PIN'; end if;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'PIN_LOCKED'; end if;
  if s.pin_hash <> _hash_pin(s.pin_salt, coalesce(p_pin, '')) then
    update member_secrets
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
     where member_id = m.id;
    -- Commit the counter: return a marker instead of raising (raising would roll it back).
    return null;
  end if;
  update member_secrets set failed_attempts = 0, locked_until = null where member_id = m.id;
  delete from member_devices where user_id = auth.uid() and house_id = h.id;
  insert into member_devices (user_id, member_id, house_id) values (auth.uid(), m.id, h.id);
  return h.id;
end $$;

create or replace function public.my_houses()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id, 'name', h.name, 'member_id', m.id, 'role', m.role, 'color', m.color, 'my_name', m.name
  ) order by d.created_at), '[]'::jsonb)
  from member_devices d
  join members m on m.id = d.member_id and m.status = 'active'
  join houses h on h.id = d.house_id
  where d.user_id = auth.uid();
$$;

create or replace function public.get_house(p_house uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me members; h houses;
begin
  me := _me(p_house);
  select * into h from houses where id = p_house;
  return jsonb_build_object(
    'house', jsonb_build_object(
      'id', h.id, 'name', h.name, 'code', h.code, 'is_open', h.is_open,
      'photo_required', h.photo_required, 'vote_window_days', h.vote_window_days,
      'week_start', h.week_start, 'created_at', h.created_at),
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'color', me.color, 'role', me.role),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'color', m.color, 'role', m.role, 'status', m.status,
        'claimed', m.claimed_at is not null, 'created_at', m.created_at,
        'devices', (select count(*) from member_devices d where d.member_id = m.id)
      ) order by m.created_at) from members m where m.house_id = p_house), '[]'::jsonb),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'position', s.position)
      order by s.position, s.created_at) from sections s where s.house_id = p_house), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'section_id', t.section_id, 'name', t.name, 'icon', t.icon,
        'points', t.points, 'position', t.position)
      order by t.position, t.created_at) from tasks t where t.house_id = p_house and not t.archived), '[]'::jsonb)
  );
end $$;

create or replace function public.get_logs(p_house uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform _me(p_house);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'member_id', l.member_id, 'task_id', l.task_id, 'task_name', l.task_name,
      'task_icon', l.task_icon, 'points', l.points, 'done_at', l.done_at, 'created_at', l.created_at,
      'note', l.note, 'before_path', l.before_path, 'after_path', l.after_path,
      'logged_by', l.logged_by, 'voided', l.voided, 'voided_at', l.voided_at,
      'vote_override', l.vote_override, 'edited_at', l.edited_at,
      'votes', coalesce((select jsonb_agg(v.member_id) from log_votes v where v.log_id = l.id), '[]'::jsonb),
      'pending', (select jsonb_build_object('id', r.id, 'kind', r.kind, 'member_id', r.member_id)
                    from change_requests r where r.log_id = l.id and r.status = 'pending')
    ) order by l.done_at desc)
    from logs l where l.house_id = p_house
  ), '[]'::jsonb);
end $$;

create or replace function public.get_requests(p_house uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me members;
begin
  me := _me(p_house);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'log_id', r.log_id, 'member_id', r.member_id, 'kind', r.kind,
      'payload', r.payload, 'reason', r.reason, 'status', r.status,
      'created_at', r.created_at, 'resolved_at', r.resolved_at
    ) order by r.created_at desc)
    from change_requests r
    where r.house_id = p_house
      and (me.role = 'owner' or r.member_id = me.id)
      and (r.status = 'pending' or r.resolved_at > now() - interval '14 days')
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Logging chores
-- ---------------------------------------------------------------------------
create or replace function public.log_chore(
  p_house uuid, p_task uuid, p_done_at timestamptz,
  p_note text default null, p_before text default null, p_after text default null,
  p_member uuid default null, p_custom_name text default null, p_points int default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare me members; h houses; t tasks; v_target uuid; v_name text; v_icon text; v_points int; v_id uuid;
  v_owner boolean;
begin
  me := _me(p_house);
  v_owner := me.role = 'owner';
  select * into h from houses where id = p_house;

  if p_member is null or p_member = me.id then
    v_target := me.id;
  elsif not v_owner then
    raise exception 'OWNER_ONLY';
  else
    select id into v_target from members where id = p_member and house_id = p_house and status = 'active';
    if v_target is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  end if;

  if p_task is not null then
    select * into t from tasks where id = p_task and house_id = p_house and not archived;
    if not found then raise exception 'TASK_NOT_FOUND'; end if;
    v_name := t.name; v_icon := t.icon; v_points := t.points;
  else
    if not v_owner then raise exception 'TASK_REQUIRED'; end if;
    v_name := left(_clean(p_custom_name), 40);
    if v_name is null then raise exception 'TASK_REQUIRED'; end if;
    v_icon := 'other'; v_points := coalesce(p_points, 0);
  end if;
  if v_owner and p_points is not null then v_points := p_points; end if;
  if v_points < 0 or v_points > 1000 then raise exception 'BAD_POINTS'; end if;

  perform _check_done_at(p_done_at, v_owner);
  perform _check_path(p_house, p_before);
  perform _check_path(p_house, p_after);
  if h.photo_required and not v_owner and p_after is null then raise exception 'PHOTO_REQUIRED'; end if;

  insert into logs (house_id, member_id, task_id, task_name, task_icon, points, done_at, note,
                    before_path, after_path, logged_by)
  values (p_house, v_target, p_task, v_name, v_icon, v_points, p_done_at,
          left(_clean(p_note), 280), p_before, p_after, me.id)
  returning id into v_id;
  return v_id;
end $$;

-- Owner edits a log directly. Payload keys (all optional): task_id, member_id,
-- done_at, note, points, before_path, after_path (null removes a photo).
-- Returns photo paths that are no longer referenced so the client can delete them.
create or replace function public._apply_log_patch(p_log uuid, p jsonb, p_owner boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l logs; t tasks; v_removed jsonb := '[]'::jsonb; v_done timestamptz;
begin
  select * into l from logs where id = p_log for update;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;

  if p ? 'task_id' and (p->>'task_id') is not null and (p->>'task_id')::uuid is distinct from l.task_id then
    select * into t from tasks where id = (p->>'task_id')::uuid and house_id = l.house_id;
    if not found then raise exception 'TASK_NOT_FOUND'; end if;
    l.task_id := t.id; l.task_name := t.name; l.task_icon := t.icon; l.points := t.points;
  end if;
  if p_owner and p ? 'task_name' and l.task_id is null and _clean(p->>'task_name') is not null then
    l.task_name := left(_clean(p->>'task_name'), 40);
  end if;
  if p_owner and p ? 'member_id' and (p->>'member_id') is not null then
    if not exists (select 1 from members where id = (p->>'member_id')::uuid and house_id = l.house_id) then
      raise exception 'MEMBER_NOT_FOUND';
    end if;
    l.member_id := (p->>'member_id')::uuid;
  end if;
  if p ? 'done_at' then
    v_done := (p->>'done_at')::timestamptz;
    perform _check_done_at(v_done, true);
    l.done_at := v_done;
  end if;
  if p ? 'note' then l.note := left(_clean(p->>'note'), 280); end if;
  if p_owner and p ? 'points' and (p->>'points') is not null then
    if (p->>'points')::int not between 0 and 1000 then raise exception 'BAD_POINTS'; end if;
    l.points := (p->>'points')::int;
  end if;
  if p ? 'before_path' then
    perform _check_path(l.house_id, p->>'before_path');
    if l.before_path is not null and l.before_path is distinct from (p->>'before_path') then
      v_removed := v_removed || to_jsonb(l.before_path);
    end if;
    l.before_path := p->>'before_path';
  end if;
  if p ? 'after_path' then
    perform _check_path(l.house_id, p->>'after_path');
    if l.after_path is not null and l.after_path is distinct from (p->>'after_path') then
      v_removed := v_removed || to_jsonb(l.after_path);
    end if;
    l.after_path := p->>'after_path';
  end if;

  update logs set task_id = l.task_id, task_name = l.task_name, task_icon = l.task_icon,
                  points = l.points, member_id = l.member_id, done_at = l.done_at, note = l.note,
                  before_path = l.before_path, after_path = l.after_path, edited_at = now()
   where id = l.id;
  return v_removed;
end $$;

create or replace function public.owner_update_log(p_log uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_house uuid;
begin
  select house_id into v_house from logs where id = p_log;
  if v_house is null then raise exception 'LOG_NOT_FOUND'; end if;
  perform _owner(v_house);
  -- The owner's direct edit wins over a pending request: cancel it.
  update change_requests set status = 'cancelled', resolved_at = now()
   where log_id = p_log and status = 'pending';
  return _apply_log_patch(p_log, coalesce(p_payload, '{}'::jsonb), true);
end $$;

create or replace function public.owner_delete_log(p_log uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l logs; v_paths jsonb := '[]'::jsonb;
begin
  select * into l from logs where id = p_log;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;
  perform _owner(l.house_id);
  if l.before_path is not null then v_paths := v_paths || to_jsonb(l.before_path); end if;
  if l.after_path is not null then v_paths := v_paths || to_jsonb(l.after_path); end if;
  select v_paths || coalesce(jsonb_agg(x), '[]'::jsonb) into v_paths from (
    select r.payload->>'before_path' x from change_requests r where r.log_id = l.id and r.payload->>'before_path' is not null
    union select r.payload->>'after_path' from change_requests r where r.log_id = l.id and r.payload->>'after_path' is not null
  ) q;
  delete from logs where id = l.id;
  return v_paths;
end $$;

-- ---------------------------------------------------------------------------
-- Change requests (members ask, owner approves)
-- ---------------------------------------------------------------------------
create or replace function public.request_change(p_log uuid, p_kind text, p_payload jsonb, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare l logs; me members; v_id uuid; p jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  select * into l from logs where id = p_log;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;
  me := _me(l.house_id);
  if me.role = 'owner' then raise exception 'OWNER_EDITS_DIRECTLY'; end if;
  if l.member_id <> me.id and l.logged_by is distinct from me.id then raise exception 'NOT_YOUR_LOG'; end if;
  if p_kind not in ('edit', 'delete') then raise exception 'BAD_REQUEST'; end if;
  if exists (select 1 from change_requests where log_id = p_log and status = 'pending') then
    raise exception 'REQUEST_PENDING';
  end if;
  if p_kind = 'edit' then
    p := p - 'member_id' - 'points';  -- members cannot reassign or set points
    if p = '{}'::jsonb then raise exception 'NOTHING_TO_CHANGE'; end if;
    if p ? 'done_at' then perform _check_done_at((p->>'done_at')::timestamptz, false); end if;
    if p ? 'task_id' and not exists (select 1 from tasks where id = (p->>'task_id')::uuid and house_id = l.house_id and not archived) then
      raise exception 'TASK_NOT_FOUND';
    end if;
    perform _check_path(l.house_id, p->>'before_path');
    perform _check_path(l.house_id, p->>'after_path');
  else
    p := '{}'::jsonb;
  end if;
  insert into change_requests (house_id, log_id, member_id, kind, payload, reason)
  values (l.house_id, p_log, me.id, p_kind, p, left(_clean(p_reason), 280))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cancel_request(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r change_requests; me members;
begin
  select * into r from change_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'REQUEST_NOT_FOUND'; end if;
  me := _me(r.house_id);
  if r.member_id <> me.id then raise exception 'NOT_ALLOWED'; end if;
  update change_requests set status = 'cancelled', resolved_at = now() where id = r.id;
  return _request_orphans(r);
end $$;

-- Photo paths uploaded for a request that will never be applied.
create or replace function public._request_orphans(r public.change_requests)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l logs; v jsonb := '[]'::jsonb;
begin
  select * into l from logs where id = r.log_id;
  if r.payload->>'before_path' is not null and r.payload->>'before_path' is distinct from l.before_path then
    v := v || to_jsonb(r.payload->>'before_path');
  end if;
  if r.payload->>'after_path' is not null and r.payload->>'after_path' is distinct from l.after_path then
    v := v || to_jsonb(r.payload->>'after_path');
  end if;
  return v;
end $$;

create or replace function public.resolve_request(p_request uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r change_requests; v jsonb;
begin
  select * into r from change_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'REQUEST_NOT_FOUND'; end if;
  perform _owner(r.house_id);
  if not p_approve then
    update change_requests set status = 'rejected', resolved_at = now() where id = r.id;
    return _request_orphans(r);
  end if;
  update change_requests set status = 'approved', resolved_at = now() where id = r.id;
  if r.kind = 'delete' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
      select before_path x from logs where id = r.log_id and before_path is not null
      union all select after_path from logs where id = r.log_id and after_path is not null
    ) q;
    -- keep the request row as history by detaching it before the log is deleted
    update change_requests set log_id = null where log_id = r.log_id and status <> 'pending';
    delete from logs where id = r.log_id;
    return v;
  end if;
  return _apply_log_patch(r.log_id, r.payload, false);
end $$;

-- ---------------------------------------------------------------------------
-- Votes: "this wasn't done properly"
-- A log is voided when MORE than half of all joined members (the doer counts in
-- the total but can't vote) vote against it. A voided log scores −50% of its points.
-- ---------------------------------------------------------------------------
create or replace function public.vote_log(p_log uuid, p_vote boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l logs; me members; h houses; v_votes int; v_total int; v_voided boolean;
begin
  select * into l from logs where id = p_log for update;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;
  me := _me(l.house_id);
  select * into h from houses where id = l.house_id;
  if l.member_id = me.id then raise exception 'CANT_VOTE_OWN'; end if;
  if l.voided then raise exception 'ALREADY_VOIDED'; end if;
  if l.vote_override then raise exception 'VOTE_LOCKED'; end if;
  if p_vote then
    if l.done_at < now() - make_interval(days => h.vote_window_days) then raise exception 'VOTE_WINDOW_CLOSED'; end if;
    insert into log_votes (log_id, member_id, house_id) values (l.id, me.id, l.house_id) on conflict do nothing;
  else
    delete from log_votes where log_id = l.id and member_id = me.id;
  end if;

  select count(*) into v_votes from log_votes v join members m on m.id = v.member_id
   where v.log_id = l.id and m.status = 'active';
  v_total := _voter_count(l.house_id);
  v_voided := v_votes * 2 > v_total;
  if v_voided then
    update logs set voided = true, voided_at = now() where id = l.id;
  end if;
  return jsonb_build_object('votes', v_votes, 'total', v_total, 'voided', v_voided);
end $$;

-- Owner can reverse a void (or pre-emptively lock voting on a log).
create or replace function public.restore_log(p_log uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l logs;
begin
  select * into l from logs where id = p_log;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;
  perform _owner(l.house_id);
  delete from log_votes where log_id = l.id;
  update logs set voided = false, voided_at = null, vote_override = true where id = l.id;
end $$;

create or replace function public.void_log(p_log uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l logs;
begin
  select * into l from logs where id = p_log;
  if not found then raise exception 'LOG_NOT_FOUND'; end if;
  perform _owner(l.house_id);
  update logs set voided = true, voided_at = now(), vote_override = false where id = l.id;
end $$;

-- ---------------------------------------------------------------------------
-- House settings (owner)
-- ---------------------------------------------------------------------------
create or replace function public.update_house(p_house uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _owner(p_house);
  if p_patch ? 'name' and _clean(p_patch->>'name') is null then raise exception 'NAME_REQUIRED'; end if;
  update houses set
    name             = case when p_patch ? 'name' then left(_clean(p_patch->>'name'), 40) else name end,
    is_open          = case when p_patch ? 'is_open' then (p_patch->>'is_open')::boolean else is_open end,
    photo_required   = case when p_patch ? 'photo_required' then (p_patch->>'photo_required')::boolean else photo_required end,
    vote_window_days = case when p_patch ? 'vote_window_days' then (p_patch->>'vote_window_days')::int else vote_window_days end,
    week_start       = case when p_patch ? 'week_start' then (p_patch->>'week_start')::int else week_start end
  where id = p_house;
end $$;

create or replace function public.regenerate_code(p_house uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  perform _owner(p_house);
  v := _new_code();
  update houses set code = v where id = p_house;
  return v;
end $$;

create or replace function public.delete_house(p_house uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _owner(p_house);
  delete from houses where id = p_house;
end $$;

-- ---------------------------------------------------------------------------
-- Sections & tasks (owner)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_section(p_house uuid, p_id uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform _owner(p_house);
  if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
  if p_id is null then
    insert into sections (house_id, name, position)
    values (p_house, left(_clean(p_name), 30), coalesce((select max(position) + 1 from sections where house_id = p_house), 0))
    returning id into v;
  else
    update sections set name = left(_clean(p_name), 30) where id = p_id and house_id = p_house returning id into v;
    if v is null then raise exception 'SECTION_NOT_FOUND'; end if;
  end if;
  return v;
end $$;

create or replace function public.delete_section(p_house uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _owner(p_house);
  update tasks set section_id = null where section_id = p_id and house_id = p_house;
  delete from sections where id = p_id and house_id = p_house;
end $$;

create or replace function public.upsert_task(
  p_house uuid, p_id uuid, p_section uuid, p_name text, p_icon text, p_points int
) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform _owner(p_house);
  if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
  if p_points is null or p_points not between 0 and 1000 then raise exception 'BAD_POINTS'; end if;
  if p_section is not null and not exists (select 1 from sections where id = p_section and house_id = p_house) then
    raise exception 'SECTION_NOT_FOUND';
  end if;
  if p_id is null then
    insert into tasks (house_id, section_id, name, icon, points, position)
    values (p_house, p_section, left(_clean(p_name), 40), coalesce(nullif(p_icon, ''), 'other'), p_points,
            coalesce((select max(position) + 1 from tasks where house_id = p_house), 0))
    returning id into v;
  else
    update tasks set section_id = p_section, name = left(_clean(p_name), 40),
                     icon = coalesce(nullif(p_icon, ''), 'other'), points = p_points
     where id = p_id and house_id = p_house and not archived returning id into v;
    if v is null then raise exception 'TASK_NOT_FOUND'; end if;
  end if;
  return v;
end $$;

-- Tasks are archived (not deleted) so history keeps working.
create or replace function public.delete_task(p_house uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _owner(p_house);
  update tasks set archived = true, section_id = null where id = p_id and house_id = p_house;
end $$;

-- p_layout: { sections: [section_id, ...], tasks: [{ id, section_id|null }, ...] } in display order
create or replace function public.reorder(p_house uuid, p_layout jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare x record;
begin
  perform _owner(p_house);
  for x in select value::text::uuid as id, ordinality - 1 as pos
             from jsonb_array_elements_text(coalesce(p_layout->'sections', '[]'::jsonb)) with ordinality loop
    update sections set position = x.pos where id = x.id and house_id = p_house;
  end loop;
  for x in select (value->>'id')::uuid as id, nullif(value->>'section_id', '')::uuid as sid, ordinality - 1 as pos
             from jsonb_array_elements(coalesce(p_layout->'tasks', '[]'::jsonb)) with ordinality loop
    update tasks set position = x.pos,
                     section_id = case when x.sid is null or exists (select 1 from sections where id = x.sid and house_id = p_house)
                                       then x.sid else section_id end
     where id = x.id and house_id = p_house;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
create or replace function public.add_member(p_house uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform _owner(p_house);
  if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
  if exists (select 1 from members where house_id = p_house and status = 'active' and lower(name) = lower(left(_clean(p_name), 24))) then
    raise exception 'NAME_TAKEN';
  end if;
  if _active_count(p_house) >= 30 then raise exception 'HOUSE_FULL'; end if;
  insert into members (house_id, name) values (p_house, left(_clean(p_name), 24)) returning id into v;
  return v;
end $$;

create or replace function public.update_member(p_member uuid, p_name text, p_color text)
returns void language plpgsql security definer set search_path = public as $$
declare m members; me members;
begin
  select * into m from members where id = p_member and status = 'active';
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  me := _me(m.house_id);
  if me.id <> m.id and me.role <> 'owner' then raise exception 'NOT_ALLOWED'; end if;
  if p_name is not null then
    if _clean(p_name) is null then raise exception 'NAME_REQUIRED'; end if;
    if exists (select 1 from members where house_id = m.house_id and status = 'active' and id <> m.id
               and lower(name) = lower(left(_clean(p_name), 24))) then
      raise exception 'NAME_TAKEN';
    end if;
  end if;
  if p_color is not null then
    perform _check_color(p_color);
    if exists (select 1 from members where house_id = m.house_id and status = 'active' and id <> m.id
               and upper(color) = upper(p_color)) then
      raise exception 'COLOR_TAKEN';
    end if;
  end if;
  update members set name = coalesce(left(_clean(p_name), 24), name),
                     color = coalesce(upper(p_color), color)
   where id = m.id;
end $$;

create or replace function public.remove_member(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m members; me members;
begin
  select * into m from members where id = p_member and status = 'active';
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  me := _owner(m.house_id);
  if m.id = me.id then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  if m.claimed_at is null and not exists (select 1 from logs where member_id = m.id) then
    delete from members where id = m.id;  -- never joined: remove completely
  else
    update members set status = 'removed' where id = m.id;
    delete from member_devices where member_id = m.id;
    delete from log_votes where member_id = m.id and log_id in (select id from logs where not voided);
    update change_requests set status = 'cancelled', resolved_at = now() where member_id = m.id and status = 'pending';
  end if;
end $$;

-- Owner: sign a member out everywhere and free their name so they can re-join
-- with a new PIN (for a lost phone / forgotten PIN). Needs the house to be open.
create or replace function public.reset_member(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m members; me members;
begin
  select * into m from members where id = p_member and status = 'active';
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  me := _owner(m.house_id);
  if m.id = me.id then raise exception 'NOT_ALLOWED'; end if;
  delete from member_devices where member_id = m.id;
  delete from member_secrets where member_id = m.id;
  update members set claimed_at = null where id = m.id;
end $$;

create or replace function public.transfer_owner(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m members; me members;
begin
  select * into m from members where id = p_member and status = 'active';
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  me := _owner(m.house_id);
  if m.id = me.id then return; end if;
  if m.claimed_at is null then raise exception 'NOT_JOINED_YET'; end if;
  update members set role = 'member' where id = me.id;
  update members set role = 'owner' where id = m.id;
  update change_requests set status = 'cancelled', resolved_at = now() where member_id = m.id and status = 'pending';
end $$;

create or replace function public.leave_house(p_house uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me members;
begin
  me := _me(p_house);
  if me.role = 'owner' then raise exception 'OWNER_CANNOT_LEAVE'; end if;
  update members set status = 'removed' where id = me.id;
  delete from member_devices where member_id = me.id;
  update change_requests set status = 'cancelled', resolved_at = now() where member_id = me.id and status = 'pending';
end $$;

-- Sign this device out of a house without leaving it.
create or replace function public.sign_out_house(p_house uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from member_devices where user_id = auth.uid() and house_id = p_house;
end $$;

create or replace function public.set_pin(p_house uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
declare me members;
begin
  me := _me(p_house);
  perform _set_pin(me.id, p_pin);
end $$;

create or replace function public.ping()
returns text language sql stable as $$ select 'ok'::text $$;

-- ---------------------------------------------------------------------------
-- Reports: anyone can flag something sus (undone chore, mess, damage...) with
-- photos. Reports can be anonymous: the real author lives in report_authors,
-- which has no read policy, so it never leaves the database.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  house_id         uuid not null references public.houses(id) on delete cascade,
  shown_reporter   uuid references public.members(id) on delete set null, -- null when anonymous
  anonymous        boolean not null default false,
  category         text not null default 'other' check (category in ('undone', 'mess', 'damage', 'supplies', 'other')),
  title            text not null check (char_length(title) between 1 and 80),
  details          text check (details is null or char_length(details) <= 500),
  about_member     uuid references public.members(id) on delete set null,
  task_id          uuid references public.tasks(id) on delete set null,
  photos           text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 4),
  status           text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by      uuid references public.members(id) on delete set null,
  resolved_at      timestamptz,
  resolution_note  text check (resolution_note is null or char_length(resolution_note) <= 280),
  resolution_photo text,
  created_at       timestamptz not null default now()
);
create index if not exists reports_house_idx on public.reports (house_id, created_at desc);

create table if not exists public.report_authors (
  report_id uuid primary key references public.reports(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade
);

create table if not exists public.report_agrees (
  report_id  uuid not null references public.reports(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  house_id   uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, member_id)
);

create or replace function public._report_author(p_report uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select member_id from report_authors where report_id = p_report;
$$;

create or replace function public.create_report(
  p_house uuid, p_category text, p_title text, p_details text,
  p_about uuid, p_task uuid, p_photos jsonb, p_anonymous boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare me members; v_id uuid; v_photos text[] := '{}'; ph text;
begin
  me := _me(p_house);
  if _clean(p_title) is null then raise exception 'TITLE_REQUIRED'; end if;
  if coalesce(p_category, 'other') not in ('undone', 'mess', 'damage', 'supplies', 'other') then raise exception 'BAD_REQUEST'; end if;
  if p_about is not null and not exists (select 1 from members where id = p_about and house_id = p_house and status = 'active') then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  if p_task is not null and not exists (select 1 from tasks where id = p_task and house_id = p_house) then
    raise exception 'TASK_NOT_FOUND';
  end if;
  for ph in select jsonb_array_elements_text(coalesce(p_photos, '[]'::jsonb)) loop
    perform _check_path(p_house, ph);
    v_photos := v_photos || ph;
  end loop;
  if coalesce(array_length(v_photos, 1), 0) > 4 then raise exception 'TOO_MANY_PHOTOS'; end if;
  if (select count(*) from reports r join report_authors a on a.report_id = r.id
       where a.member_id = me.id and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'SLOW_DOWN';
  end if;
  insert into reports (house_id, shown_reporter, anonymous, category, title, details, about_member, task_id, photos)
  values (p_house, case when coalesce(p_anonymous, false) then null else me.id end, coalesce(p_anonymous, false),
          coalesce(p_category, 'other'), left(_clean(p_title), 80), left(_clean(p_details), 500), p_about, p_task, v_photos)
  returning id into v_id;
  insert into report_authors (report_id, member_id) values (v_id, me.id);
  return v_id;
end $$;

create or replace function public.get_reports(p_house uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me members;
begin
  me := _me(p_house);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'reporter_id', r.shown_reporter, 'anonymous', r.anonymous,
      'mine', a.member_id = me.id,
      'category', r.category, 'title', r.title, 'details', r.details,
      'about_member', r.about_member, 'task_id', r.task_id, 'photos', to_jsonb(r.photos),
      'status', r.status, 'resolved_by', r.resolved_by, 'resolved_at', r.resolved_at,
      'resolution_note', r.resolution_note, 'resolution_photo', r.resolution_photo,
      'created_at', r.created_at,
      'agrees', coalesce((select jsonb_agg(g.member_id) from report_agrees g where g.report_id = r.id), '[]'::jsonb)
    ) order by (r.status = 'open') desc, r.created_at desc)
    from reports r join report_authors a on a.report_id = r.id
    where r.house_id = p_house
  ), '[]'::jsonb);
end $$;

create or replace function public.agree_report(p_report uuid, p_agree boolean)
returns int language plpgsql security definer set search_path = public as $$
declare r reports; me members; n int;
begin
  select * into r from reports where id = p_report;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  me := _me(r.house_id);
  if _report_author(r.id) = me.id or r.about_member = me.id then raise exception 'CANT_AGREE_OWN'; end if;
  if r.status <> 'open' then raise exception 'REPORT_CLOSED'; end if;
  if p_agree then
    insert into report_agrees (report_id, member_id, house_id) values (r.id, me.id, r.house_id) on conflict do nothing;
  else
    delete from report_agrees where report_id = r.id and member_id = me.id;
  end if;
  select count(*) into n from report_agrees where report_id = r.id;
  return n;
end $$;

-- The reporter, the person it's about, or the owner can resolve it.
create or replace function public.resolve_report(p_report uuid, p_note text, p_photo text)
returns void language plpgsql security definer set search_path = public as $$
declare r reports; me members;
begin
  select * into r from reports where id = p_report for update;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  me := _me(r.house_id);
  if me.role <> 'owner' and me.id is distinct from _report_author(r.id) and me.id is distinct from r.about_member then
    raise exception 'NOT_ALLOWED';
  end if;
  if r.status = 'resolved' then raise exception 'REPORT_CLOSED'; end if;
  perform _check_path(r.house_id, p_photo);
  update reports set status = 'resolved', resolved_by = me.id, resolved_at = now(),
         resolution_note = left(_clean(p_note), 280), resolution_photo = p_photo
   where id = r.id;
end $$;

-- Reporter or owner can reopen (e.g. it wasn't really fixed). Returns the
-- old resolution photo path so the client can delete it.
create or replace function public.reopen_report(p_report uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r reports; me members;
begin
  select * into r from reports where id = p_report for update;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  me := _me(r.house_id);
  if me.role <> 'owner' and me.id is distinct from _report_author(r.id) then raise exception 'NOT_ALLOWED'; end if;
  update reports set status = 'open', resolved_by = null, resolved_at = null, resolution_note = null, resolution_photo = null
   where id = r.id;
  return r.resolution_photo;
end $$;

-- Reporter or owner can delete. Returns photo paths for cleanup.
create or replace function public.delete_report(p_report uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r reports; me members;
begin
  select * into r from reports where id = p_report;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  me := _me(r.house_id);
  if me.role <> 'owner' and me.id is distinct from _report_author(r.id) then raise exception 'NOT_ALLOWED'; end if;
  delete from reports where id = r.id;
  return to_jsonb(r.photos) || case when r.resolution_photo is null then '[]'::jsonb else jsonb_build_array(r.resolution_photo) end;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security. Everything is written through the functions above;
-- direct table access is read-only and limited to your own house (used by
-- realtime change notifications).
-- ---------------------------------------------------------------------------
alter table public.houses          enable row level security;
alter table public.members         enable row level security;
alter table public.member_secrets  enable row level security;
alter table public.member_devices  enable row level security;
alter table public.sections        enable row level security;
alter table public.tasks           enable row level security;
alter table public.logs            enable row level security;
alter table public.log_votes       enable row level security;
alter table public.change_requests enable row level security;
alter table public.reports         enable row level security;
alter table public.report_authors  enable row level security;
alter table public.report_agrees   enable row level security;

drop policy if exists houses_read on public.houses;
create policy houses_read on public.houses for select to authenticated using (public.is_member(id));
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member(house_id));
drop policy if exists devices_read on public.member_devices;
create policy devices_read on public.member_devices for select to authenticated using (user_id = auth.uid());
drop policy if exists sections_read on public.sections;
create policy sections_read on public.sections for select to authenticated using (public.is_member(house_id));
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (public.is_member(house_id));
drop policy if exists logs_read on public.logs;
create policy logs_read on public.logs for select to authenticated using (public.is_member(house_id));
drop policy if exists votes_read on public.log_votes;
create policy votes_read on public.log_votes for select to authenticated using (public.is_member(house_id));
drop policy if exists requests_read on public.change_requests;
create policy requests_read on public.change_requests for select to authenticated using (public.is_member(house_id));
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated using (public.is_member(house_id));
drop policy if exists report_agrees_read on public.report_agrees;
create policy report_agrees_read on public.report_agrees for select to authenticated using (public.is_member(house_id));
-- report_authors: intentionally no policy (keeps anonymous reporters private)

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'grant select on public.houses, public.members, public.member_devices, public.sections, public.tasks, public.logs, public.log_votes, public.change_requests, public.reports, public.report_agrees to authenticated';
    execute 'revoke execute on all functions in schema public from public, anon';
    execute 'grant execute on all functions in schema public to authenticated';
    execute 'grant execute on function public.ping() to anon';
    -- internal helpers are not part of the API
    execute 'revoke execute on function public._set_pin(uuid, text), public._apply_log_patch(uuid, jsonb, boolean) from authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Supabase-only bits: realtime + photo storage (skipped automatically elsewhere)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['houses','members','sections','tasks','logs','log_votes','change_requests','reports','report_agrees'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('chore-photos', 'chore-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = false, file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

    execute 'drop policy if exists chore_photos_read on storage.objects';
    execute $p$create policy chore_photos_read on storage.objects for select to authenticated
             using (bucket_id = 'chore-photos' and public.is_member_folder(name))$p$;
    execute 'drop policy if exists chore_photos_insert on storage.objects';
    execute $p$create policy chore_photos_insert on storage.objects for insert to authenticated
             with check (bucket_id = 'chore-photos' and public.is_member_folder(name))$p$;
    execute 'drop policy if exists chore_photos_delete on storage.objects';
    execute $p$create policy chore_photos_delete on storage.objects for delete to authenticated
             using (bucket_id = 'chore-photos' and (public.is_owner_folder(name) or owner_id = auth.uid()::text))$p$;
  end if;
end $$;

-- Ask the API layer to pick up new/changed functions right away.
select pg_notify('pgrst', 'reload schema');
