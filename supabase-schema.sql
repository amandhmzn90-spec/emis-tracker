-- ==========================================================
-- EMIS Tracker — Supabase schema
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- ==========================================================

-- ---------- SCHOOLS ----------
create table if not exists schools (
  school_name    text primary key,
  emis_available boolean not null default false,
  school_type    text not null default 'Lainnya',   -- TK / RA / KB / Lainnya
  nsm            text not null default '',           -- Nomor Statistik Madrasah (RA only)
  updated_at     timestamptz not null default now()
);

-- ---------- STUDENTS ----------
create table if not exists students (
  id             text primary key,
  nama           text not null,
  nisn           text not null default '-',
  asal_sekolah   text not null,
  kelas_paralel  text not null default '',
  emis_status    text not null default 'not_entered', -- 'entered' / 'not_entered'
  father_name    text default '',
  father_nik     text default '',
  mother_name    text default '',
  mother_nik     text default '',
  kk             text default '',
  phone          text default '',
  guardian_phone text default '',
  address        text default '',
  updated_at     timestamptz not null default now()
);

-- ---------- DAILY CHECK (Cek Harian EMIS) ----------
create table if not exists daily_checks (
  school_name text not null,
  check_date  date not null,
  primary key (school_name, check_date)
);

-- ---------- ROW LEVEL SECURITY ----------
-- Required for the client (anon key) to read/write at all. These policies
-- allow full access to anyone holding the anon key — appropriate for a
-- small internal tool shared with trusted coworkers, but note that the
-- anon key ships inside the app's JS, so anyone who gets the app files
-- effectively has the same access. Do not use this schema for public data.
alter table schools       enable row level security;
alter table students      enable row level security;
alter table daily_checks  enable row level security;

drop policy if exists "anon full access" on schools;
create policy "anon full access" on schools
  for all using (true) with check (true);

drop policy if exists "anon full access" on students;
create policy "anon full access" on students
  for all using (true) with check (true);

drop policy if exists "anon full access" on daily_checks;
create policy "anon full access" on daily_checks
  for all using (true) with check (true);

-- ---------- REALTIME ----------
-- Lets every open tab (including coworkers') see edits live.
-- Wrapped so re-running this script doesn't error if already added.
do $$
begin
  begin
    alter publication supabase_realtime add table schools;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table students;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table daily_checks;
  exception when duplicate_object then null;
  end;
end $$;
