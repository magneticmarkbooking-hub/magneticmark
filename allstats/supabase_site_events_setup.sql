-- =====================================================
-- MAGNETICMARK – site_events
-- Uruchom raz w Supabase SQL Editor
-- =====================================================

create table if not exists site_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  event_type  text not null,   -- 'Contact' | 'ViewContent' | 'Lead'
  content_name text not null   -- 'Booking Button' | 'Spotify' | 'Email Copy' itd.
);

-- RLS: anonimowy może tylko wstawiać
alter table site_events enable row level security;

create policy "anon insert" on site_events
  for insert to anon with check (true);

create policy "anon select" on site_events
  for select to anon using (true);

-- Indeks na czas (do filtrowania po dacie)
create index if not exists site_events_created_at_idx on site_events (created_at desc);
