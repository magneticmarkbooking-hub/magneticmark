-- ===========================================================
-- MAGNETICMARK - Ręczne dane Spotify do MagneticScore
-- ===========================================================
-- Skopiuj cały ten plik i wklej w Supabase: SQL Editor -> New query
-- -> wklej -> Run. Wystarczy zrobić to RAZ - ta sama tabela obsługuje
-- wszystkie wydania (rozróżniane po kolumnie "release_slug").
--
-- Ta tabela jest NIEZALEŻNA od "release_events" (tej z views/clicks).
-- Trzyma tylko dwie ręcznie wpisywane liczby ze Spotify for Artists
-- (streams i saves po 28 dniach od wydania), które razem z CTR z
-- release_events składają się na MagneticScore widoczny w All Stats.

create table release_manual_stats (
  release_slug text primary key,
  streams_28d bigint,
  saves_28d bigint,
  updated_at timestamptz default now()
);

-- Włączamy Row Level Security - te same zasady co dla release_events:
-- każdy z "anon key" może zarówno czytać jak i zapisywać. Formularz na
-- stronie All Stats jest jedynym miejscem, które do tego pisze - nie ma
-- hasła/PINu (decyzja: prostota ważniejsza niż ochrona przed kimś, kto
-- i tak musiałby znać URL Supabase + klucz, żeby cokolwiek nadpisać).
alter table release_manual_stats enable row level security;

create policy "Każdy może wpisywać/aktualizować ręczne statystyki"
  on release_manual_stats for insert
  to anon
  with check (true);

create policy "Każdy może aktualizować ręczne statystyki"
  on release_manual_stats for update
  to anon
  using (true)
  with check (true);

create policy "Każdy może czytać ręczne statystyki"
  on release_manual_stats for select
  to anon
  using (true);
