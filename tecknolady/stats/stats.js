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

const DAILY_WINDOW_SIZE = 14;
const DAILY_RANGE_DAYS = 60;
let dailyWindowOffset = 0;
let dailyEventsCache = [];

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
    if (!map[day]) return;
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
  const allDays = Object.keys(map).sort();

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
    const label = day.slice(5).replace('-', '/');
    return `
      <div class="daily-bar-group" data-day="${label}" data-views="${views}" data-clicks="${clicks}">
        <div class="daily-bar-pair">
          <div class="daily-bar daily-bar-views" style="height:${viewsPct}%"></div>
          <div class="daily-bar daily-bar-clicks" style="height:${clicksPct}%"></div>
        </div>
        <span class="daily-bar-label">${label}</span>
      </div>
    `;
  }).join('');

  attachDailyTooltips(container);

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
  dailyWindowOffset += direction;
  renderDailyChart();
}

let dailyTooltipAttached = false;

function attachDailyTooltips(container) {
  let tooltipEl = document.getElementById('dailyTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'dailyTooltip';
    tooltipEl.className = 'daily-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(groupEl) {
    const { day, views, clicks } = groupEl.dataset;
    tooltipEl.innerHTML = `<strong>${day}</strong><br>Views: ${views} · Clicks: ${clicks}`;
    const rect = groupEl.getBoundingClientRect();
    tooltipEl.style.display = 'block';
    const tooltipRect = tooltipEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top - tooltipRect.height - 8;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    if (top < 8) top = rect.bottom + 8;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    tooltipEl.dataset.activeDay = day;
  }

  function hideTooltip() {
    tooltipEl.style.display = 'none';
    delete tooltipEl.dataset.activeDay;
  }

  if (dailyTooltipAttached) return;
  dailyTooltipAttached = true;

  let recentTouchUntil = 0;

  container.addEventListener('mouseover', (e) => {
    if (Date.now() < recentTouchUntil) return;
    const groupEl = e.target.closest('.daily-bar-group');
    if (groupEl) showTooltip(groupEl);
  });
  container.addEventListener('mouseout', (e) => {
    if (Date.now() < recentTouchUntil) return;
    const groupEl = e.target.closest('.daily-bar-group');
    if (groupEl) hideTooltip();
  });

  container.addEventListener('touchstart', (e) => {
    const groupEl = e.target.closest('.daily-bar-group');
    if (!groupEl) return;
    e.stopPropagation();
    recentTouchUntil = Date.now() + 500;
    showTooltip(groupEl);
  });

  document.addEventListener('touchstart', (e) => {
    if (!container.contains(e.target)) hideTooltip();
  });
}

// Supabase/PostgREST zwraca maksymalnie 1000 wierszy na jedno zapytanie.
// Bez paginacji świeże (dzisiejsze) zdarzenia wypadają poza to okno, gdy
// wydanie ma już ponad 1000 zdarzeń. Dlatego pobieramy je stronami po 1000
// (nagłówek Range), aż dostaniemy niepełną stronę = koniec danych.
const PAGE_SIZE = 1000;

async function fetchAllEvents() {
  const all = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/release_events?release_slug=eq.${encodeURIComponent(RELEASE_SLUG)}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Range-Unit': 'items',
          'Range': `${from}-${to}`
        }
      }
    );
    if (!res.ok) throw new Error('Supabase request failed: ' + res.status);

    const page = await res.json();
    all.push(...page);

    if (page.length < PAGE_SIZE) break; // ostatnia (niepełna) strona
    from += PAGE_SIZE;

    if (from > 500000) break; // bezpiecznik przeciw nieskończonej pętli
  }

  return all;
}

async function loadStats() {
  const noteEl = document.getElementById('statsNote');

  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.indexOf('PLACEHOLDER') === 0) {
    noteEl.textContent = 'Supabase not configured yet - paste your project details into SUPABASE_DANE.js to see live stats.';
    return;
  }

  let events;
  try {
    events = await fetchAllEvents();
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
  dailyWindowOffset = 0;
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
