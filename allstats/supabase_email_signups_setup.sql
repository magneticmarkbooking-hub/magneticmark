-- ===========================================================
-- MAGNETICMARK - Zapisy email z popupu strony głównej
-- ===========================================================
-- Skopiuj cały ten plik i wklej w Supabase: SQL Editor -> New query
-- -> wklej -> Run. Wystarczy zrobić to RAZ.
--
-- Ta tabela jest NIEZALEŻNA od release_events i release_manual_stats.
-- Zbiera adresy email zapisane przez popup na stronie głównej
-- (magneticmarkdj.com), widoczne potem w All Stats z możliwością
-- eksportu do CSV (do wklejenia ręcznie do Twojego email marketingu).

create table email_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text not null
);

-- Włączamy Row Level Security - te same zasady co dla innych tabel:
-- każdy z "anon key" może zapisywać (to robi popup na stronie) i
-- czytać (to robi All Stats, żeby pokazać listę + eksport CSV).
alter table email_signups enable row level security;

create policy "Każdy może zapisać swój email"
  on email_signups for insert
  to anon
  with check (true);

create policy "Każdy może czytać zapisane maile"
  on email_signups for select
  to anon
  using (true);

-- Unikalność - ten sam email nie dubluje się w bazie, jeśli ktoś
-- przypadkiem zapisze się dwa razy (np. na dwóch różnych wydaniach
-- popup może się pojawić ponownie po wyczyszczeniu localStorage).
create unique index idx_email_signups_email on email_signups (lower(email));
