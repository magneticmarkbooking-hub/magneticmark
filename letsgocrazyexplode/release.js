/* ===========================================================
   MAGNETICMARK – Landing Page Wydania (release.js)
   =========================================================== */

(function renderRelease() {
  document.getElementById('eyebrowText').textContent = RELEASE.eyebrow;
  document.getElementById('titleText').textContent = RELEASE.title;
  document.getElementById('coverImg').src = RELEASE.cover;
  document.getElementById('coverImg').alt = RELEASE.title + ' - cover';
  document.title = RELEASE.title + ' | MagneticMark';

  const spotifyBtn = document.getElementById('spotifyBtn');
  spotifyBtn.dataset.link = RELEASE.linkUrl;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', RELEASE.description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', RELEASE.title + ' | MagneticMark');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', RELEASE.description);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute('content', RELEASE.coverRaw || RELEASE.cover);
})();

// Klik na przycisk: odpalamy NASZ Meta Pixel (27127010080316320) z eventem
// ViewContent, a potem przechodzimy na stronę Tonden/fanlink. Pixel na tamtej
// stronie (inny ID, zarządzany przez Tonden) jest całkowicie niezależny -
// odpali się dodatkowo tam, bez żadnej kolizji z naszym trackingiem tutaj.
function handleLinkClick(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const url = el.dataset.link;

  if (typeof fbq !== 'undefined') {
    fbq('track', 'ViewContent', {
      content_name: RELEASE.title,
      content_category: 'Music Release',
      content_type: 'music_release'
    });
  }

  window.location.href = url;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('spotifyBtn').addEventListener('click', handleLinkClick);
});

// ===== PŁYWAJĄCE KULE ŚWIATŁA W TLE =====
function initBgOrbs() {
  const colors = ['rgba(123,47,255,0.5)', 'rgba(0,136,255,0.45)', 'rgba(255,215,0,0.3)'];
  const container = document.body;
  for (let i = 0; i < 5; i++) {
    const orb = document.createElement('div');
    orb.className = 'bg-orb';
    const size = 60 + Math.random() * 140;
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.left = Math.random() * 100 + 'vw';
    orb.style.top = Math.random() * 100 + 'vh';
    orb.style.background = colors[i % colors.length];
    orb.style.animationDuration = (10 + Math.random() * 10) + 's';
    orb.style.animationDelay = (Math.random() * -10) + 's';
    container.appendChild(orb);
  }
}

// ===== PARALLAX GLOW - delikatna reakcja na ruch myszy (tylko desktop fine pointer) =====
function initParallaxGlow() {
  const glow = document.querySelector('.ambient-glow');
  if (!glow) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.addEventListener('mousemove', (e) => {
    const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
    const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
    const moveX = xPercent * 30;
    const moveY = yPercent * 30;
    glow.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  });
}

// ===== CARD TILT - delikatny 3D tilt na cover, tylko desktop =====
function initCoverTilt() {
  const frame = document.querySelector('.cover-frame');
  const wrap = document.querySelector('.cover-wrap');
  if (!frame || !wrap) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    frame.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  });
  wrap.addEventListener('mouseleave', () => {
    frame.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initBgOrbs();
    initParallaxGlow();
    initCoverTilt();
  });
} else {
  initBgOrbs();
  initParallaxGlow();
  initCoverTilt();
}

// ===== CUSTOM CURSOR - identyczny mechanizm jak na magneticmarkdj.com =====
function initCustomCursor() {
  const canvas = document.getElementById('cursorTrailCanvas');
  const core = document.getElementById('customCursorCore');
  if (!canvas || !core) return;

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const TIP_OFFSET_X = 4;
  const TIP_OFFSET_Y = 2;

  let mouseX = -100, mouseY = -100;
  let lastX = -100, lastY = -100;
  let points = [];
  let cursorVisible = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    core.style.left = mouseX + 'px';
    core.style.top = mouseY + 'px';

    if (!cursorVisible) {
      core.style.display = 'block';
      cursorVisible = true;
      document.body.classList.add('has-custom-cursor');
    }

    const tipX = mouseX + TIP_OFFSET_X;
    const tipY = mouseY + TIP_OFFSET_Y;

    const dist = Math.hypot(tipX - lastX, tipY - lastY);
    const steps = Math.min(Math.max(Math.floor(dist / 4), 1), 12);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push({
        x: lastX + (tipX - lastX) * t,
        y: lastY + (tipY - lastY) * t,
        life: 1
      });
    }
    if (points.length > 60) points.splice(0, points.length - 60);
    lastX = tipX;
    lastY = tipY;
  });

  function hideCursor() {
    core.style.display = 'none';
    cursorVisible = false;
    points = [];
  }
  function showCursor() {
    core.style.display = 'block';
    cursorVisible = true;
    document.body.classList.add('has-custom-cursor');
  }

  document.documentElement.addEventListener('mouseleave', hideCursor);
  document.documentElement.addEventListener('mouseenter', showCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideCursor();
  });

  function drawTrail() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.life -= 0.05;
      if (p.life <= 0) continue;
      const radius = 4 * p.life + 1;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.2);
      grad.addColorStop(0, 'rgba(170,100,255,' + (p.life * 0.55) + ')');
      grad.addColorStop(1, 'rgba(123,47,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    points = points.filter(p => p.life > 0);
    requestAnimationFrame(drawTrail);
  }
  drawTrail();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomCursor);
} else {
  initCustomCursor();
}
