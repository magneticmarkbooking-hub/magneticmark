/* ===========================================================
   MAGNETICMARK – All Stats hub (all-stats.js)
   ===========================================================
   Wczytuje releases.json i renderuje karty wydań. Każda karta:
   - linkuje do /[slug]/stats/ (panel statystyk tego wydania)
   - pokazuje MagneticScore: wskaźnik 0-100 liczony z trzech
     składników (każdy waży ~33%):
       1. CTR z release_events w Supabase, w oknie 28 dni od
          release_date (benchmark: CTR 70% = pełne punkty)
       2. Streams w 28 dni (benchmark: 155 000 = pełne punkty)
       3. Saves w 28 dni (benchmark: 5500 = pełne punkty)
   - streams/saves wpisuje się ręcznie (pole + przycisk Apply),
     bo Spotify nie udostępnia tego przez darmowe/publiczne API
     (popularity/streams zostały usunięte z Spotify Web API w
     lutym 2026). Wpisane wartości zapisują się trwale w Supabase
     (tabela release_manual_stats), więc są widoczne z każdego
     urządzenia/przeglądarki po odświeżeniu.
   =========================================================== */

const BENCHMARK_CTR = 70;          // %
const BENCHMARK_STREAMS_28D = 155000;
const BENCHMARK_SAVES_28D = 5500;
const WINDOW_DAYS = 28;

async function loadReleases() {
  const grid = document.getElementById('releaseGrid');

  let releases;
  try {
    const res = await fetch('releases.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('releases.json fetch failed: ' + res.status);
    releases = await res.json();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="empty-state">Could not load releases list.</p>';
    return;
  }

  if (!Array.isArray(releases) || releases.length === 0) {
    grid.innerHTML = '<p class="empty-state">No releases yet.</p>';
    return;
  }

  releases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  grid.innerHTML = releases.map((r) => renderCard(r)).join('');

  // Dane Supabase (CTR + ręczne streams/saves) wczytujemy DOPO renderze
  // kart - karta od razu jest widoczna, score "dogania" ją po chwili.
  releases.forEach((r) => loadScoreForRelease(r));

  // Podpinamy obsługę przycisku "Apply" na każdej karcie (delegacja,
  // jeden listener na cały grid, działa dla wszystkich kart).
  grid.addEventListener('click', onApplyClick);
}

function renderCard(r) {
  const slug = r.slug;
  const title = r.title || slug;
  const cover = r.cover || '';
  const platform = r.platform || '';
  const dateLabel = formatMonth(r.date);
  return `
    <div class="release-card-wrap" data-slug="${slug}" data-release-date="${r.release_date || ''}">
      <a class="release-card" href="../${slug}/stats/">
        ${cover ? `<img class="release-card-cover" src="${cover}" alt="${title}" loading="lazy">` : ''}
        <div class="release-card-body">
          <div class="release-card-title">${title}</div>
          <div class="release-card-meta">
            <span>${[platform, dateLabel].filter(Boolean).join(' · ')}</span>
            <span class="release-card-arrow">View stats →</span>
          </div>
        </div>
      </a>
      <div class="magnetic-score-box">
        <div class="magnetic-score-label">MagneticScore <span class="magnetic-score-window">(28d)</span></div>
        <div class="magnetic-score-value" data-role="score-value">—</div>
        <div class="magnetic-score-inputs">
          <input type="number" min="0" inputmode="numeric" class="ms-input" data-role="streams-input" placeholder="Streams">
          <input type="number" min="0" inputmode="numeric" class="ms-input" data-role="saves-input" placeholder="Saves">
          <button type="button" class="ms-apply-btn" data-role="apply-btn">Apply</button>
        </div>
        <div class="magnetic-score-note" data-role="score-note"></div>
      </div>
    </div>
  `;
}

function formatMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [year, month] = yyyyMm.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(month, 10) - 1;
  return months[idx] ? `${months[idx]} ${year}` : yyyyMm;
}

function isSupabaseConfigured() {
  return typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL.indexOf('PLACEHOLDER') !== 0;
}

// Liczy CTR (%) z release_events w oknie 28 dni od releaseDate. Jeśli
// releaseDate jest pusty/niepoprawny, liczy z WSZYSTKICH zdarzeń (lepiej
// pokazać coś niż nic, gdy ktoś nie wypełnił jeszcze release_date).
async function fetchCtr28d(slug, releaseDateStr) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/release_events?release_slug=eq.${encodeURIComponent(slug)}&select=event_type,created_at`,
    { headers: { 'apikey': SUPABASE_ANON_KEY } }
  );
  if (!res.ok) throw new Error('release_events fetch failed: ' + res.status);
  const events = await res.json();

  let filtered = events;
  const releaseDate = releaseDateStr ? new Date(releaseDateStr + 'T00:00:00Z') : null;
  if (releaseDate && !isNaN(releaseDate.getTime())) {
    const windowEnd = new Date(releaseDate.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
    filtered = events.filter((e) => {
      const t = new Date(e.created_at);
      return t >= releaseDate && t <= windowEnd;
    });
  }

  const views = filtered.filter((e) => e.event_type === 'view').length;
  const clicks = filtered.filter((e) => e.event_type === 'click').length;
  return views ? (clicks / views) * 100 : 0;
}

async function fetchManualStats(slug) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/release_manual_stats?release_slug=eq.${encodeURIComponent(slug)}&select=streams_28d,saves_28d`,
    { headers: { 'apikey': SUPABASE_ANON_KEY } }
  );
  if (!res.ok) throw new Error('release_manual_stats fetch failed: ' + res.status);
  const rows = await res.json();
  return rows[0] || null;
}

async function saveManualStats(slug, streams, saves) {
  // upsert: jeśli wiersz dla tego slug już istnieje, nadpisuje go;
  // jeśli nie istnieje, tworzy nowy. Wymaga "Prefer: resolution=merge-duplicates"
  // i release_slug jako primary key (ustawione w supabase_manual_stats_setup.sql).
  const res = await fetch(`${SUPABASE_URL}/rest/v1/release_manual_stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      release_slug: slug,
      streams_28d: streams,
      saves_28d: saves,
      updated_at: new Date().toISOString()
    })
  });
  if (!res.ok) throw new Error('release_manual_stats save failed: ' + res.status);
}

function computeMagneticScore(ctrPct, streams, saves) {
  const ctrScore = clamp01(ctrPct / BENCHMARK_CTR) * 100;
  const streamsScore = clamp01(streams / BENCHMARK_STREAMS_28D) * 100;
  const savesScore = clamp01(saves / BENCHMARK_SAVES_28D) * 100;
  return Math.round((ctrScore + streamsScore + savesScore) / 3);
}

function clamp01(n) {
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(n, 1);
}

async function loadScoreForRelease(r) {
  const card = document.querySelector(`.release-card-wrap[data-slug="${r.slug}"]`);
  if (!card) return;
  const valueEl = card.querySelector('[data-role="score-value"]');
  const noteEl = card.querySelector('[data-role="score-note"]');
  const streamsInput = card.querySelector('[data-role="streams-input"]');
  const savesInput = card.querySelector('[data-role="saves-input"]');

  if (!isSupabaseConfigured()) {
    noteEl.textContent = 'Supabase not configured yet.';
    return;
  }

  try {
    const [ctrPct, manual] = await Promise.all([
      fetchCtr28d(r.slug, r.release_date),
      fetchManualStats(r.slug)
    ]);

    const streams = manual ? Number(manual.streams_28d) || 0 : 0;
    const saves = manual ? Number(manual.saves_28d) || 0 : 0;

    if (manual) {
      streamsInput.value = streams;
      savesInput.value = saves;
    }

    if (manual) {
      const score = computeMagneticScore(ctrPct, streams, saves);
      valueEl.textContent = score;
      noteEl.textContent = `CTR ${ctrPct.toFixed(1)}%`;
    } else {
      valueEl.textContent = '—';
      noteEl.textContent = `CTR ${ctrPct.toFixed(1)}% · add streams/saves to get a score`;
    }
  } catch (err) {
    console.error(err);
    noteEl.textContent = 'Could not load score right now.';
  }
}

async function onApplyClick(e) {
  const btn = e.target.closest('[data-role="apply-btn"]');
  if (!btn) return;

  const card = btn.closest('.release-card-wrap');
  const slug = card.dataset.slug;
  const streamsInput = card.querySelector('[data-role="streams-input"]');
  const savesInput = card.querySelector('[data-role="saves-input"]');
  const noteEl = card.querySelector('[data-role="score-note"]');
  const valueEl = card.querySelector('[data-role="score-value"]');

  const streams = Math.max(0, parseInt(streamsInput.value, 10) || 0);
  const saves = Math.max(0, parseInt(savesInput.value, 10) || 0);

  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await saveManualStats(slug, streams, saves);
    const releaseDate = card.dataset.releaseDate;
    const ctrPct = await fetchCtr28d(slug, releaseDate);
    const score = computeMagneticScore(ctrPct, streams, saves);
    valueEl.textContent = score;
    noteEl.textContent = `CTR ${ctrPct.toFixed(1)}% · saved`;
  } catch (err) {
    console.error(err);
    noteEl.textContent = 'Could not save. Try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Apply';
  }
}

loadReleases();
loadEmailSignups();


/* ===========================================================
   EMAIL SIGNUPS - lista zapisanych adresów (tabela email_signups)
   z możliwością eksportu do CSV. Maile wpisane przez popup na
   stronie głównej (script.js -> submitEmailPopup()).
   =========================================================== */

let emailSignupsCache = [];

async function loadEmailSignups() {
  const countEl = document.getElementById('emailCount');
  const listEl = document.getElementById('emailList');
  const exportBtn = document.getElementById('exportCsvBtn');

  if (!isSupabaseConfigured()) {
    countEl.textContent = 'Supabase not configured yet.';
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/email_signups?select=email,created_at&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY } }
    );
    if (!res.ok) throw new Error('email_signups fetch failed: ' + res.status);
    emailSignupsCache = await res.json();
  } catch (err) {
    console.error(err);
    countEl.textContent = 'Could not load email signups right now.';
    return;
  }

  countEl.textContent = `${emailSignupsCache.length} signup${emailSignupsCache.length === 1 ? '' : 's'}`;

  if (emailSignupsCache.length === 0) {
    listEl.innerHTML = '<p class="empty-state" style="padding:16px;">No signups yet.</p>';
    exportBtn.disabled = true;
    return;
  }

  listEl.innerHTML = emailSignupsCache.map((row) => `
    <div class="email-list-row">
      <span class="email-list-address">${escapeHtml(row.email)}</span>
      <span class="email-list-date">${formatDate(row.created_at)}</span>
    </div>
  `).join('');

  exportBtn.disabled = false;
  exportBtn.onclick = exportEmailsToCsv;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exportEmailsToCsv() {
  if (emailSignupsCache.length === 0) return;

  const header = 'email,created_at';
  const rows = emailSignupsCache.map((row) => {
    // Cudzysłów wokół email na wszelki wypadek (gdyby zawierał przecinek
    // - w praktyce e-maile nie zawierają przecinków, ale to bezpieczne).
    const email = `"${(row.email || '').replace(/"/g, '""')}"`;
    return `${email},${row.created_at || ''}`;
  });
  const csvContent = [header, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magneticmark-email-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
