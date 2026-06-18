/* ===========================================================
   MAGNETICMARK – Panel statystyk wydania (stats.js)
   ===========================================================
   Pyta Supabase o wszystkie zdarzenia dla danego wydania
   (RELEASE_SLUG, ustawiony w index.html), agreguje je i renderuje
   karty + wykresy. Jeśli Supabase nie jest jeszcze skonfigurowany
   (placeholder w SUPABASE_DANE.js), panel pokazuje czytelny komunikat
   zamiast się wywalać.
   =========================================================== */

const COUNTRY_NAMES = {
  PL: 'Poland', DE: 'Germany', US: 'United States', GB: 'United Kingdom',
  FR: 'France', NL: 'Netherlands', ES: 'Spain', IT: 'Italy', CZ: 'Czechia',
  SK: 'Slovakia', AT: 'Austria', BE: 'Belgium', SE: 'Sweden', UA: 'Ukraine'
};

function countryLabel(code) {
  if (!code) return 'Unknown';
  return COUNTRY_NAMES[code] || code;
}

function platformLabel(inAppBrowser) {
  if (!inAppBrowser) return 'Browser (direct)';
  return inAppBrowser.charAt(0).toUpperCase() + inAppBrowser.slice(1);
}

// Liczy wystąpienia danej kategorii w tablicy zdarzeń, zwraca tablicę
// [{label, count}] zsortowaną od największej do najmniejszej.
function tally(events, keyFn, labelFn) {
  const counts = {};
  events.forEach((ev) => {
    const key = keyFn(ev) || '__unknown__';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .map((key) => ({ label: labelFn(key === '__unknown__' ? null : key), count: counts[key] }))
    .sort((a, b) => b.count - a.count);
}

function renderBarList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No data yet</p>';
    return;
  }
  const max = items[0].count;
  container.innerHTML = items.map((item) => `
    <div class="bar-row">
      <span class="bar-row-label">${item.label}</span>
      <div class="bar-row-track"><div class="bar-row-fill" style="width:${(item.count / max * 100).toFixed(0)}%"></div></div>
      <span class="bar-row-count">${item.count}</span>
    </div>
  `).join('');
}

// Stan przesuwanego okna wykresu dziennego: 0 = najnowsze WINDOW_SIZE dni,
// 1 = jedno okno wstecz, itd. WINDOW_SIZE dni widoczne na raz w wykresie.
const DAILY_WINDOW_SIZE = 14; // ile dni widać jednocześnie na ekranie
const DAILY_RANGE_DAYS = 60;  // ile dni wstecz w sumie można przewinąć
let dailyWindowOffset = 0;
let dailyEventsCache = [];

// Zwraca mapę {YYYY-MM-DD: {views: n, clicks: n}} dla wszystkich dni
// w ostatnich DAILY_RANGE_DAYS dniach (łącznie z dniami bez żadnych zdarzeń,
// żeby wykres miał ciągłą skalę czasu, a nie tylko dni z ruchem).
function buildDailyMap(events) {
  const map = {};
  const today = new Date();
  for (let i = 0; i < DAILY_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = { views: 0, clicks: 0 };
  }
  events.forEach((ev) => {
    const day = (ev.created_at || '').slice(0, 10);
    if (!map[day]) return; // poza zakresem 60 dni - ignorujemy
    if (ev.event_type === 'view') map[day].views++;
    else if (ev.event_type === 'click') map[day].clicks++;
  });
  return map;
}

function renderDailyChart() {
  const container = document.getElementById('dailyChart');
  const rangeLabel = document.getElementById('dailyRangeLabel');

  if (!dailyEventsCache.length) {
    container.innerHTML = '<p class="empty-state">No data yet</p>';
    if (rangeLabel) rangeLabel.textContent = '';
    return;
  }

  const map = buildDailyMap(dailyEventsCache);
  const allDays = Object.keys(map).sort(); // najstarszy -> najnowszy

  // Okno: offset 0 pokazuje najnowsze WINDOW_SIZE dni, offset 1 przesuwa
  // się WINDOW_SIZE dni w przeszłość, itd.
  const maxOffset = Math.ceil(DAILY_RANGE_DAYS / DAILY_WINDOW_SIZE) - 1;
  dailyWindowOffset = Math.max(0, Math.min(dailyWindowOffset, maxOffset));

  const endIndex = allDays.length - (dailyWindowOffset * DAILY_WINDOW_SIZE);
  const startIndex = Math.max(0, endIndex - DAILY_WINDOW_SIZE);
  const visibleDays = allDays.slice(startIndex, endIndex);

  const max = Math.max(...visibleDays.map((d) => map[d].views + map[d].clicks > 0 ? Math.max(map[d].views, map[d].clicks) : 0), 1);

  container.innerHTML = visibleDays.map((day) => {
    const { views, clicks } = map[day];
    const viewsPct = Math.max((views / max) * 100, views > 0 ? 3 : 0);
    const clicksPct = Math.max((clicks / max) * 100, clicks > 0 ? 3 : 0);
    const label = day.slice(5).replace('-', '/'); // MM/DD
    return `
      <div class="daily-bar-group">
        <div class="daily-bar-pair">
          <div class="daily-bar daily-bar-views" style="height:${viewsPct}%" title="${day} - Views: ${views}"></div>
          <div class="daily-bar daily-bar-clicks" style="height:${clicksPct}%" title="${day} - Clicks: ${clicks}"></div>
        </div>
        <span class="daily-bar-label">${label}</span>
      </div>
    `;
  }).join('');

  if (rangeLabel && visibleDays.length) {
    const first = visibleDays[0].slice(5).replace('-', '/');
    const last = visibleDays[visibleDays.length - 1].slice(5).replace('-', '/');
    rangeLabel.textContent = `${first} – ${last}`;
  }

  const prevBtn = document.getElementById('dailyPrevBtn');
  const nextBtn = document.getElementById('dailyNextBtn');
  if (prevBtn) prevBtn.disabled = dailyWindowOffset >= maxOffset;
  if (nextBtn) nextBtn.disabled = dailyWindowOffset <= 0;
}

function shiftDailyWindow(direction) {
  dailyWindowOffset += direction; // +1 = wstecz w czasie, -1 = do przodu
  renderDailyChart();
}

async function loadStats() {
  const noteEl = document.getElementById('statsNote');

  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.indexOf('PLACEHOLDER') === 0) {
    noteEl.textContent = 'Supabase not configured yet - paste your project details into SUPABASE_DANE.js to see live stats.';
    return;
  }

  let events;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/release_events?release_slug=eq.${encodeURIComponent(RELEASE_SLUG)}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );
    if (!res.ok) throw new Error('Supabase request failed: ' + res.status);
    events = await res.json();
  } catch (err) {
    noteEl.textContent = 'Could not load stats right now. Try refreshing the page.';
    return;
  }

  const views = events.filter((e) => e.event_type === 'view');
  const clicks = events.filter((e) => e.event_type === 'click');

  document.getElementById('totalViews').textContent = views.length;
  document.getElementById('totalClicks').textContent = clicks.length;
  document.getElementById('ctrValue').textContent =
    views.length ? ((clicks.length / views.length) * 100).toFixed(1) + '%' : '—';

  const countryTally = tally(views, (e) => e.country, countryLabel);
  document.getElementById('topCountry').textContent = countryTally.length ? countryTally[0].label : '—';
  renderBarList('countryList', countryTally);

  renderBarList('platformList', tally(views, (e) => e.in_app_browser, platformLabel));
  renderBarList('deviceList', tally(views, (e) => e.device_type, (d) => d ? (d.charAt(0).toUpperCase() + d.slice(1)) : 'Unknown'));

  dailyEventsCache = events;
  dailyWindowOffset = 0; // po każdym świeżym wczytaniu wracamy do najnowszego okna
  renderDailyChart();

  const prevBtn = document.getElementById('dailyPrevBtn');
  const nextBtn = document.getElementById('dailyNextBtn');
  if (prevBtn) prevBtn.onclick = () => shiftDailyWindow(1);
  if (nextBtn) nextBtn.onclick = () => shiftDailyWindow(-1);

  document.getElementById('lastUpdated').textContent =
    'Updated ' + new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  noteEl.textContent = `${events.length} total events tracked for this release.`;
}

document.addEventListener('DOMContentLoaded', loadStats);
