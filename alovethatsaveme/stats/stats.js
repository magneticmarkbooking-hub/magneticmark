/* ===========================================================
   MAGNETICMARK – Panel statystyk wydania (stats.js)
   ===========================================================
   Pobiera z Supabase wszystkie zdarzenia wydania (RELEASE_SLUG z index.html),
   agreguje je i rysuje karty, listy i wykres liniowy dzienny.
   Zdarzenia: view, click, leave, app_open, app_none, app_unknown, app_return, app_listen
   (opis w ../tracking.js).
   =========================================================== */

// Pełne nazwy krajów z kodów (PL -> Poland), wbudowane w przeglądarkę.
const regionNames = (typeof Intl !== 'undefined' && Intl.DisplayNames)
  ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

function countryLabel(code) {
  if (!code) return 'Unknown';
  try { return (regionNames && regionNames.of(code)) || code; } catch (e) { return code; }
}

function platformLabel(inAppBrowser) {
  if (!inAppBrowser) return 'Browser (direct)';
  return inAppBrowser.charAt(0).toUpperCase() + inAppBrowser.slice(1);
}

// System z kolumny os; starsze wpisy (przed kolumną os) tylko mobile/desktop.
const OS_NAMES = { android: 'Android', ios: 'iPhone / iPad', windows: 'Windows PC', mac: 'Mac', linux: 'Linux', other: 'Other' };
function osKey(ev) {
  return ev.os || (ev.device_type === 'mobile' ? 'mobile_old' : ev.device_type === 'desktop' ? 'desktop_old' : null);
}
function osLabel(key) {
  if (key === 'mobile_old') return 'Phone (OS not recorded)';
  if (key === 'desktop_old') return 'Computer (OS not recorded)';
  return OS_NAMES[key] || 'Unknown';
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

// Najwięcej `limit` pozycji, resztę zbiera w jedną "Other (N countries)".
function topWithOther(items, limit) {
  if (items.length <= limit) return items;
  const rest = items.slice(limit);
  return items.slice(0, limit).concat({
    label: `Other (${rest.length} countries)`,
    count: rest.reduce((sum, i) => sum + i.count, 0)
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function pct(a, b) {
  return b ? Math.round((a / b) * 100) + '%' : '—';
}

function renderBarList(containerId, items, total) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No data yet</p>';
    return;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  container.innerHTML = items.map((item) => `
    <div class="bar-row">
      <span class="bar-row-label">${esc(item.label)}</span>
      <div class="bar-row-track"><div class="bar-row-fill" style="width:${(item.count / max * 100).toFixed(0)}%"></div></div>
      <span class="bar-row-count">${item.count}${total ? ` <small>${pct(item.count, total)}</small>` : ''}</span>
    </div>
  `).join('');
}

// ===== Sesje: jedna osoba = jeden wynik, nawet jeśli zdarzeń było kilka =====
// Wynik aplikacji w sesji: open > none > unknown (np. Anuluj, a potem "Open in browser").
function buildSessions(events) {
  const map = {};
  events.forEach((ev) => {
    const id = ev.session_id || ('ev_' + ev.id);
    const s = map[id] || (map[id] = {
      id, view: false, click: false, app: null, ret: null, leave: null,
      device: ev.device_type, os: ev.os, inApp: ev.in_app_browser, country: ev.country, adset: adsetKey(ev)
    });
    if (!s.adset) s.adset = adsetKey(ev);
    if (!s.country && ev.country) s.country = ev.country;
    if (!s.os && ev.os) s.os = ev.os;
    switch (ev.event_type) {
      case 'view': s.view = true; break;
      case 'click': s.click = true; break;
      case 'leave': s.leave = ev.seconds; break;
      case 'app_return': s.ret = ev.seconds; break;
      case 'app_listen': s.bg30 = true; break;
      case 'app_open': s.app = 'open'; if (!s.openDay) s.openDay = (ev.created_at || '').slice(0, 10); break;
      case 'app_none': if (s.app !== 'open') s.app = 'none'; break;
      case 'app_unknown': if (!s.app) s.app = 'unknown'; break;
    }
  });
  return Object.values(map);
}

// ===== Wykres liniowy dzienny =====
const DAILY_WINDOW_SIZE = 14;
const DAILY_RANGE_DAYS = 60;
let dailyWindowOffset = 0;
let dailyEventsCache = [];

const SERIES = [
  { key: 'views', label: 'Views', color: 'var(--accent)' },
  { key: 'clicks', label: 'Clicks', color: 'var(--gold)' },
  { key: 'opens', label: 'App opens', color: '#00e5a0' },
  { key: 'listens', label: 'Listens 30 s+', color: '#ff7ae0' }
];

function buildDailyMap(events) {
  const map = {};
  const today = new Date();
  for (let i = 0; i < DAILY_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = { views: 0, clicks: 0, opens: 0, listens: 0 };
  }
  events.forEach((ev) => {
    const day = (ev.created_at || '').slice(0, 10);
    if (!map[day]) return;
    if (ev.event_type === 'view') map[day].views++;
    else if (ev.event_type === 'click') map[day].clicks++;
  });
  // otwarcie apki i odsłuch liczone raz na sesję, w dniu otwarcia (jak w tabeli ad setów)
  buildSessions(events).forEach((s) => {
    if (s.app !== 'open' || !s.openDay || !map[s.openDay]) return;
    map[s.openDay].opens++;
    if (s.ret === null || s.ret >= 30) map[s.openDay].listens++;
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
  const days = allDays.slice(Math.max(0, endIndex - DAILY_WINDOW_SIZE), endIndex);

  const W = 700, H = 200, PL = 34, PR = 10, PT = 12, PB = 26;
  const max = Math.max(1, ...days.map((d) => Math.max(map[d].views, map[d].clicks, map[d].opens, map[d].listens)));
  const x = (i) => PL + (days.length === 1 ? 0 : i * (W - PL - PR) / (days.length - 1));
  const y = (v) => PT + (H - PT - PB) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];

  let svg = `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily views, clicks and app opens">`;
  ticks.forEach((t) => {
    svg += `<line class="lc-grid" x1="${PL}" x2="${W - PR}" y1="${y(t)}" y2="${y(t)}"/>` +
           `<text class="lc-axis" x="${PL - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
  });
  days.forEach((d, i) => {
    if (i % 2 === 0 || days.length <= 7) {
      svg += `<text class="lc-axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${d.slice(5).replace('-', '/')}</text>`;
    }
  });
  SERIES.forEach((s) => {
    const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(map[d][s.key]).toFixed(1)}`).join(' ');
    svg += `<polyline class="lc-line" points="${pts}" style="stroke:${s.color}"/>`;
    days.forEach((d, i) => {
      svg += `<circle class="lc-dot" cx="${x(i)}" cy="${y(map[d][s.key])}" r="3" style="fill:${s.color}"/>`;
    });
  });
  // przezroczyste pasy do podpowiedzi
  days.forEach((d, i) => {
    const half = days.length > 1 ? (W - PL - PR) / (days.length - 1) / 2 : 20;
    svg += `<rect class="lc-hit" x="${x(i) - half}" y="0" width="${half * 2}" height="${H}" ` +
           `data-day="${d.slice(5).replace('-', '/')}" data-views="${map[d].views}" data-clicks="${map[d].clicks}" ` +
           `data-opens="${map[d].opens}" data-listens="${map[d].listens}"/>`;
  });
  svg += '</svg>';
  container.innerHTML = svg;
  attachDailyTooltips(container);

  if (rangeLabel && days.length) {
    rangeLabel.textContent = `${days[0].slice(5).replace('-', '/')} – ${days[days.length - 1].slice(5).replace('-', '/')}`;
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

function attachDailyTooltips(container) {
  let tip = document.getElementById('dailyTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'dailyTooltip';
    tip.className = 'daily-tooltip';
    document.body.appendChild(tip);
  }
  // Podpowiedź ma position: fixed, więc liczymy w układzie ekranu (bez window.scrollY),
  // przy kursorze albo palcu; gdy brak miejsca nad nim, pod spodem.
  function show(el, x, y) {
    const { day, views, clicks, opens, listens } = el.dataset;
    tip.innerHTML = `<strong>${day}</strong><br>Listens 30 s+: <b>${listens}</b><br>` +
      `App opens: ${opens}<br>Clicks: ${clicks}<br>Views: ${views}`;
    tip.style.display = 'block';
    const tr = tip.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const px = x !== undefined ? x : r.left + r.width / 2;
    const py = y !== undefined ? y : r.top + r.height / 2;
    const left = Math.max(8, Math.min(px - tr.width / 2, window.innerWidth - tr.width - 8));
    const top = py - tr.height - 14 >= 8 ? py - tr.height - 14 : py + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide() { tip.style.display = 'none'; }
  container.querySelectorAll('.lc-hit').forEach((el) => {
    el.addEventListener('mousemove', (e) => show(el, e.clientX, e.clientY));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      const t = e.touches[0];
      show(el, t.clientX, t.clientY);
    }, { passive: true });
  });
  document.addEventListener('touchstart', (e) => { if (!container.contains(e.target)) hide(); }, { passive: true });
}

// ===== Aplikacja Spotify, wyjścia, ad sety =====
function renderAppPanel(sessions) {
  const mob = sessions.filter((s) => s.click && s.device === 'mobile');
  const open = mob.filter((s) => s.app === 'open');
  const none = mob.filter((s) => s.app === 'none').length;
  const unknown = mob.filter((s) => s.app === 'unknown').length;
  const noResult = mob.length - open.length - none - unknown;
  renderBarList('appList', [
    { label: 'Spotify app opened', count: open.length },
    { label: 'Browser (no app)', count: none },
    { label: 'Nothing (e.g. Cancel)', count: unknown },
    { label: 'No result yet / left', count: noResult }
  ].filter((i) => i.count > 0), mob.length);

  const osSplit = (key) => {
    const all = mob.filter((s) => s.os === key).length;
    const op = mob.filter((s) => s.os === key && s.app === 'open').length;
    return all ? `${osLabel(key)}: ${op} of ${all} opened the app (${pct(op, all)})` : '';
  };
  // Przeglądarka Instagrama na iPhonie nie zgłasza stronie przejścia do Spotify, więc iPhone
  // wychodzi zaniżony (otwarcie apki widać tylko w Safari).
  const iosNote = osSplit('ios') ? ' · iPhone in Instagram is detected when the page pauses in the background, so it can be slightly low' : '';
  document.getElementById('appByOs').textContent = [osSplit('android'), osSplit('ios')].filter(Boolean).join(' · ') + iosNote;

  const ret30 = open.filter((s) => s.ret !== null && s.ret >= 30).length;
  const retShort = open.filter((s) => s.ret !== null && s.ret < 30).length;
  const noRet = open.length - ret30 - retShort;
  // Brak powrotu też liczymy jako odsłuch; app_listen mówi tylko, że strona żyła 30 s po wyjściu
  const noRetBg = open.filter((s) => s.ret === null && s.bg30).length;
  renderBarList('listenList', [
    { label: 'Back after 30 s+', count: ret30 },
    { label: 'No return, 30 s+ signal from background', count: noRetBg },
    { label: 'No return', count: noRet - noRetBg },
    { label: 'Back before 30 s', count: retShort }
  ].filter((i) => i.count > 0), open.length);

  document.getElementById('appOpenRate').textContent = pct(open.length, mob.length);
  document.getElementById('listenRate').textContent = ret30 + noRet;
  document.getElementById('listenHint').textContent = pct(ret30 + noRet, mob.length) + ' of phone clicks';
}

function renderLeavePanel(sessions) {
  const seen = sessions.filter((s) => s.view);
  const left = seen.filter((s) => !s.click);
  const b = (lo, hi) => left.filter((s) => s.leave !== null && s.leave >= lo && s.leave < hi).length;
  const known = left.filter((s) => s.leave !== null).length;
  renderBarList('leaveList', [
    { label: 'Left in 0–3 s', count: b(0, 3) },
    { label: 'Left in 3–10 s', count: b(3, 10) },
    { label: 'Left after 10 s+', count: b(10, 1e9) },
    { label: 'Left, time unknown', count: left.length - known }
  ].filter((i) => i.count > 0), seen.length);
  document.getElementById('bounceRate').textContent = pct(left.length, seen.length);
}

// Źródło wejścia: ID ad setu z reklamy Meta (utm_term, a gdy go brak, ID reklamy z
// utm_content), inaczej zwykły utm_content, np. "link_in_bio". Nazwy w adsets.js.
const ADSETS = (typeof ADSET_NAMES !== 'undefined') ? ADSET_NAMES : {};
const ADS = (typeof AD_TO_ADSET !== 'undefined') ? AD_TO_ADSET : {};

function adsetKey(ev) {
  if (ev.utm_term && ADSETS[ev.utm_term]) return ev.utm_term;
  if (ev.utm_content && ADS[ev.utm_content]) return ADS[ev.utm_content];
  return ev.utm_content || ev.utm_term || null;
}

function adsetLabel(key) {
  if (!key) return 'No source (direct)';
  if (ADSETS[key]) return ADSETS[key];
  if (/^\d{8,}$/.test(key)) return 'Other ad (' + key + ')';
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

const MIN_CLICKS_FOR_RATE = 10;             // mniej kliknięć = odsetek jeszcze niewiarygodny

function renderAdsetTable(sessions) {
  const el = document.getElementById('adsetTable');
  const groups = {};
  sessions.forEach((s) => {
    if (!s.view && !s.click) return;
    const k = s.adset || '';
    const g = groups[k] || (groups[k] = { name: k, views: 0, clicks: 0, mob: 0, opens: 0, listens: 0, quick: 0 });
    if (s.view) g.views++;
    if (s.click) g.clicks++;
    if (s.click && s.device === 'mobile') g.mob++;
    if (s.app === 'open') { g.opens++; if (s.ret === null || s.ret >= 30) g.listens++; }
    if (s.view && !s.click && s.leave !== null && s.leave < 3) g.quick++;
  });
  // Najważniejszy jest odsłuch 30 s+: najpierw liczba odsłuchów, potem odsetek na kliknięcie
  const rate = (g) => (g.clicks ? g.listens / g.clicks : 0);
  const rows = Object.values(groups).sort((a, b) => b.listens - a.listens || rate(b) - rate(a) || b.clicks - a.clicks);
  if (!rows.length || (rows.length === 1 && !rows[0].name)) {
    el.innerHTML = '<p class="empty-state">No ad data yet</p>';
    return;
  }
  el.innerHTML = `<table class="adset-table"><thead><tr>
      <th>Ad set</th><th class="col-key">Listens 30 s+</th><th>Listen rate</th><th>Clicks</th><th>App opens</th><th>Views</th><th>CTR</th><th>Quick exits</th>
    </tr></thead><tbody>` + rows.map((g) => `<tr>
      <td title="${esc(g.name)}">${esc(adsetLabel(g.name))}</td><td class="col-key">${g.listens}</td>
      <td>${pct(g.listens, g.clicks)}${g.clicks < MIN_CLICKS_FOR_RATE ? ' <small>few clicks</small>' : ''}</td>
      <td>${g.clicks}</td><td>${g.opens} <small>${pct(g.opens, g.mob)}</small></td>
      <td>${g.views}</td><td>${pct(g.clicks, g.views)}</td><td>${g.quick} <small>${pct(g.quick, g.views)}</small></td></tr>`).join('') +
    '</tbody></table>';
}

// Supabase/PostgREST zwraca maksymalnie 1000 wierszy na zapytanie, więc stronami.
const PAGE_SIZE = 1000;

async function fetchAllEvents() {
  const all = [];
  let from = 0;
  for (;;) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/release_events?release_slug=eq.${encodeURIComponent(RELEASE_SLUG)}&select=*&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Range-Unit': 'items', 'Range': `${from}-${from + PAGE_SIZE - 1}` } }
    );
    if (!res.ok) throw new Error('Supabase request failed: ' + res.status);
    const page = await res.json();
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from > 500000) break;
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
  document.getElementById('ctrValue').textContent = pct(clicks.length, views.length).replace('%', '') === '—'
    ? '—' : ((clicks.length / views.length) * 100).toFixed(1) + '%';

  const countryTally = tally(views, (e) => e.country, countryLabel);
  const topKnown = countryTally.find((c) => c.label !== 'Unknown');
  document.getElementById('topCountry').textContent = topKnown ? topKnown.label : '—';
  renderBarList('countryList', topWithOther(countryTally, 12), views.length);
  renderBarList('platformList', tally(views, (e) => e.in_app_browser, platformLabel));
  renderBarList('deviceList', tally(views, osKey, osLabel), views.length);

  // Nowe karty tylko z sesji nowego trackingu (mają os); starsze wpisy nie mają
  // zdarzeń leave/app_*, więc fałszowałyby procenty.
  const sessions = buildSessions(events).filter((s) => s.os);
  renderAppPanel(sessions);
  renderLeavePanel(sessions);
  renderAdsetTable(sessions);

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
