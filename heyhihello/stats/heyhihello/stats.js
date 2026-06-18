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

function renderDailyChart(events) {
  const container = document.getElementById('dailyChart');
  if (!events.length) {
    container.innerHTML = '<p class="empty-state">No data yet</p>';
    return;
  }
  const byDay = {};
  events.forEach((ev) => {
    const day = (ev.created_at || '').slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const days = Object.keys(byDay).sort().slice(-14); // ostatnie 14 dni z danymi
  const max = Math.max(...days.map((d) => byDay[d]), 1);

  container.innerHTML = days.map((day) => {
    const count = byDay[day];
    const heightPct = Math.max((count / max) * 100, 3);
    const label = day.slice(5).replace('-', '/'); // MM/DD
    return `
      <div class="daily-bar-group">
        <div class="daily-bar" style="height:${heightPct}%" title="${day}: ${count}"></div>
        <span class="daily-bar-label">${label}</span>
      </div>
    `;
  }).join('');
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

  renderDailyChart(events);

  document.getElementById('lastUpdated').textContent =
    'Updated ' + new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  noteEl.textContent = `${events.length} total events tracked for this release.`;
}

document.addEventListener('DOMContentLoaded', loadStats);
