-- ===========================================================
-- MAGNETICMARK - Statystyki landing page'y wydań
-- ===========================================================
-- Skopiuj cały ten plik i wklej w Supabase: SQL Editor -> New query
-- -> wklej -> Run. Wystarczy zrobić to RAZ - ta sama tabela obsługuje
-- wszystkie wydania (rozróżniane po kolumnie "release_slug").

create table release_events (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),

  -- Identyfikacja wydania, np. "heyhihello", "letsgocrazyexplode"
  release_slug text not null,

  -- Typ zdarzenia: 'view' (wejście na stronę) albo 'click' (kliknięcie
  -- przycisku Spotify / ViewContent)
  event_type text not null check (event_type in ('view', 'click')),

  -- Kraj odwiedzającego, ustalony przez darmowe API geolokalizacji IP
  -- (np. "PL", "DE", "US") - może być null, jeśli API nie odpowiedziało
  country text,

  -- Typ urządzenia: 'mobile' albo 'desktop'
  device_type text,

  -- Czy odwiedzający otworzył link w wewnętrznej przeglądarce aplikacji
  -- (np. "instagram", "facebook", "tiktok") - null jeśli zwykła przeglądarka
  in_app_browser text,

  -- Parametry kampanii, jeśli obecne w URL
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Lekki identyfikator sesji (ten sam mechanizm co w release.js),
  -- żeby móc (w przybliżeniu) odróżnić unikalne wizyty od powtórzeń
  session_id text
);

-- Włączamy Row Level Security - bez tego każdy z dostępem do "anon key"
-- mógłby też CZYTAĆ wszystko bez ograniczeń. Dodajemy więc reguły:
-- 1) każdy może DOPISYWAĆ nowe zdarzenia (to potrzebne dla landing page'y)
-- 2) każdy może CZYTAĆ (to potrzebne dla panelu statystyk - jest publiczny,
--    pod konkretnym URL, więc to z założenia jawne dane, nie tajne)
alter table release_events enable row level security;

create policy "Każdy może dopisywać zdarzenia"
  on release_events for insert
  to anon
  with check (true);

create policy "Każdy może czytać statystyki"
  on release_events for select
  to anon
  using (true);

-- Indeks dla szybszego filtrowania po wydaniu (przyda się gdy będzie
-- więcej wydań i więcej zdarzeń w tabeli)
create index idx_release_events_slug on release_events (release_slug);
