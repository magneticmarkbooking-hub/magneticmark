/* ===========================================================
   MAGNETICMARK – All Stats hub (all-stats.js)
   Wczytuje releases.json i renderuje karty wydań. Każda karta
   linkuje do /[slug]/stats/ - panelu statystyk tego wydania
   (ten sam panel co dotychczasowy stats/index.html per wydanie).
   =========================================================== */

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

  // Najnowsze wydania pierwsze (sortowanie po dacie, opisowo malejąco)
  releases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  grid.innerHTML = releases.map((r) => {
    const slug = r.slug;
    const title = r.title || slug;
    const cover = r.cover || '';
    const platform = r.platform || '';
    const dateLabel = formatMonth(r.date);
    return `
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
    `;
  }).join('');
}

function formatMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [year, month] = yyyyMm.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(month, 10) - 1;
  return months[idx] ? `${months[idx]} ${year}` : yyyyMm;
}

loadReleases();
