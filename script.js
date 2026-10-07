(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* ---------------- mobile nav ---------------- */
  const toggle = $('.nav-toggle'), nav = $('#site-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------------- the cookie ---------------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const cookie = $('#cookie'), inner = $('#cookieInner'), slot = $('.cookie-slot');
  const allGone = $('#allGone');

  // Each bite is a scalloped cluster of circles (tooth marks). Angles in degrees, 0 = right.
  const BITES = [
    { a: -38, d: 100, r: 30 },
    { a: 8, d: 98, r: 33 },
    { a: 52, d: 96, r: 35 },
    { a: -88, d: 96, r: 36 },
    { a: 100, d: 90, r: 40 },
    { a: 150, d: 84, r: 44 },
    { a: -140, d: 78, r: 48 },
    { a: 190, d: 40, r: 58 },
    { a: 0, d: 0, r: 140 }   // last bite: all gone
  ];
  const biteCut = $('#bitesCut'), biteRing = $('#bitesRing');
  const biteGroups = BITES.map(b => {
    const rad = b.a * Math.PI / 180;
    const cx = 100 + Math.cos(rad) * b.d, cy = 100 + Math.sin(rad) * b.d;
    const spread = b.d ? (b.r / b.d) * 0.95 : 0;
    const circles = [
      [cx, cy, b.r],
      [100 + Math.cos(rad - spread) * (b.d + 3), 100 + Math.sin(rad - spread) * (b.d + 3), b.r * .6],
      [100 + Math.cos(rad + spread) * (b.d + 3), 100 + Math.sin(rad + spread) * (b.d + 3), b.r * .6]
    ];
    const mk = extra => {
      const g = document.createElementNS(SVGNS, 'g');
      g.style.display = 'none';
      circles.forEach(([x, y, r]) => {
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r + extra);
        g.appendChild(c);
      });
      return g;
    };
    const cut = mk(0), ring = mk(4.5);
    biteCut.appendChild(cut); biteRing.appendChild(ring);
    return { cut, ring, cx, cy };
  });

  const bar = $('#socialBar');
  let big = 200, small = 110, slotX = 0, slotY = 0, shown = 0, barH = 0;

  function measure() {
    const r = slot.getBoundingClientRect();
    big = r.width || 200;
    slotX = r.left + scrollX;
    slotY = r.top + scrollY;
    small = innerWidth < 700 ? 76 : 108;
    barH = bar.offsetHeight;
    cookie.style.width = cookie.style.height = big + 'px';
  }

  function cookieScreenPoint(svgX, svgY) {
    const r = cookie.getBoundingClientRect();
    return { x: r.left + svgX / 200 * r.width, y: r.top + svgY / 200 * r.height, size: r.width };
  }

  function setBites(n) {
    if (n === shown) return;
    const prev = shown;
    shown = n;
    biteGroups.forEach((b, i) => {
      const on = i < n ? '' : 'none';
      b.cut.style.display = on; b.ring.style.display = on;
    });
    const gone = n >= BITES.length;
    cookie.classList.toggle('is-gone', gone);
    allGone.hidden = !gone;
    if (n > prev && !reduceMotion) {
      inner.classList.remove('chomp'); void inner.offsetWidth; inner.classList.add('chomp');
      const b = biteGroups[n - 1];
      const p = gone ? cookieScreenPoint(100, 100) : cookieScreenPoint(b.cx, b.cy);
      burst(p.x, p.y, gone ? 46 : 16, p.size / 200);
    }
  }

  let lastY = scrollY, crumbDebt = 0;
  function update() {
    const s = scrollY, vh = innerHeight, vw = document.documentElement.clientWidth;
    // stay in the hero until the slot rises into the upper part of the screen, then fly to the corner
    const start = Math.max(0, slotY - vh * 0.6);
    const t = ease(clamp((s - start) / (vh * 0.55), 0, 1));
    const sx = slotX - scrollX, sy = slotY - s;
    const ex = vw - small - 14, ey = vh - barH - small * .82; // perched on the social bar
    const x = lerp(sx, ex, t), y = lerp(sy, ey, t), sc = lerp(1, small / big, t);
    cookie.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;

    const max = document.documentElement.scrollHeight - vh;
    const p = max > 0 ? s / max : 0;
    // first bite once it has landed in the corner, last one right at the bottom
    let n = 0;
    BITES.forEach((_, i) => { if (p >= 0.1 + i * (0.88 / (BITES.length - 1))) n = i + 1; });
    setBites(n);

    // a little trail of crumbs as you scroll, once the cookie is bitten
    const dy = Math.abs(s - lastY); lastY = s;
    if (!reduceMotion && n > 0 && n < BITES.length && t >= 1) {
      crumbDebt += dy;
      while (crumbDebt > 55) {
        crumbDebt -= 55;
        const r = cookie.getBoundingClientRect();
        spawn(r.left + r.width * (.25 + Math.random() * .5), r.top + r.height * .8, (Math.random() - .5) * 2.4, -Math.random() * 2, .8);
      }
    }
  }

  inner.addEventListener('click', () => {
    if (reduceMotion) return;
    inner.classList.remove('chomp'); void inner.offsetWidth; inner.classList.add('chomp');
    const r = cookie.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 12, r.width / 200);
  });

  /* ---------------- crumbs ---------------- */
  const canvas = $('#crumbs'), ctx = canvas.getContext('2d');
  const COLORS = ['#D49A5C', '#B9783C', '#EDC88E', '#E2AE70', '#4A2816', '#5A3520', '#3A1F10'];
  let crumbs = [], W = 0, H = 0, dpr = 1, running = false;

  function resizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(x, y, vx, vy, scale = 1) {
    const size = (2 + Math.random() * 4.5) * scale;
    const pts = [];
    const k = 5 + (Math.random() * 3 | 0);
    for (let i = 0; i < k; i++) {
      const a = i / k * Math.PI * 2, rr = size * (.6 + Math.random() * .5);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    // mostly golden cookie crumbs, some chocolate bits
    const color = COLORS[Math.random() < .7 ? (Math.random() * 4 | 0) : 4 + (Math.random() * 3 | 0)];
    crumbs.push({ x, y, vx, vy, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, pts, size, color, rest: 0, alpha: 1 });
    if (crumbs.length > 320) crumbs.splice(0, crumbs.length - 320);
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function burst(x, y, count, scale) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4.5;
      spawn(x + (Math.random() - .5) * 20 * scale, y + (Math.random() - .5) * 20 * scale,
        Math.cos(a) * sp, Math.sin(a) * sp - 3, Math.max(.8, scale * 1.2));
    }
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now();
    crumbs = crumbs.filter(c => c.alpha > 0.02 && c.y < H + 40);
    for (const c of crumbs) {
      if (!c.rest) {
        c.vy += .32; c.vx *= .992;
        c.x += c.vx; c.y += c.vy; c.rot += c.vr;
        const floor = H - barH - c.size * .6; // crumbs land on the social bar
        if (c.y > floor) {
          c.y = floor;
          if (Math.abs(c.vy) < 1.6) { c.rest = now; c.vy = 0; }
          else { c.vy *= -.32; c.vx *= .55; c.vr *= .5; }
        }
      } else if (now - c.rest > 2600) {
        c.alpha -= .025;
      }
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      c.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (crumbs.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  /* ---------------- gallery ---------------- */
  $$('.chip').forEach(chip => chip.addEventListener('click', () => {
    $$('.chip').forEach(c => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-pressed', c === chip); });
    const f = chip.dataset.filter;
    $$('#masonry li').forEach(li => { li.hidden = f !== 'all' && li.dataset.cat !== f; });
  }));

  const lightbox = $('#lightbox'), lbImg = $('#lightboxImg'), lbCap = $('#lightboxCap');
  $$('.tile').forEach(tile => tile.addEventListener('click', () => {
    const img = $('img', tile);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.textContent = $('span', tile).textContent;
    lightbox.showModal();
  }));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

  /* ---------------- classes & events (from Google Sheets) ---------------- */
  // Paste the sheet's "Publish to web" CSV link here (see events-sheet-setup.md).
  // Left empty, the site reads the local events.csv template instead.
  const EVENTS_SHEET_CSV = '';
  const FACEBOOK_URL = 'https://www.facebook.com/p/Krystyns-Cookie-Cottage-61581379451408/';

  const eventsEl = $('#events');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    return rows
      .filter(r => r.some(v => v.trim()))
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  // Accepts 2026-12-06, 12/6/2026 or "Dec 6, 2026", however the sheet formats it
  function parseDate(str) {
    let m;
    if ((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2] - 1, +m[3]);
    if ((m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], m[1] - 1, +m[2]);
    const d = new Date(str);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const toNum = v => (v === '' || isNaN(+v) ? null : +v);

  function toEvent(row) {
    const date = parseDate(row.date || '');
    const status = (row.status || '').toLowerCase();
    if (!date || !row.title || /hid|draft/.test(status)) return null;
    const left = toNum(row.seats_left), total = toNum(row.seats_total);
    const link = /^https?:\/\//i.test(row.ticket_link || '') ? row.ticket_link : '';
    return {
      date, title: row.title, venue: row.venue, time: row.time, blurb: row.description,
      price: row.price, left, total, link,
      full: /sold|full/.test(status) || left === 0
    };
  }

  function renderEvents(list) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = list.filter(ev => ev && ev.date >= today).sort((a, b) => a.date - b.date);
    if (!upcoming.length) {
      eventsEl.innerHTML = `<p class="events-status">No classes on the calendar right now. New dates go up on <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a> first, or host a private class below.</p>`;
      return;
    }
    eventsEl.innerHTML = upcoming.map((ev, i) => {
      const month = ev.date.toLocaleDateString('en-US', { month: 'short' });
      const day = String(ev.date.getDate()).padStart(2, '0');
      const weekday = ev.date.toLocaleDateString('en-US', { weekday: 'long' });
      const when = [weekday + (ev.time ? ', ' + ev.time : ''), ev.venue].filter(Boolean).join(', ');
      const price = /^\$?\d+(\.\d\d)?$/.test(ev.price) ? `$${esc(ev.price.replace('$', ''))} <small>per seat</small>` : esc(ev.price);

      let seats = '';
      if (ev.full) seats = 'This class is full';
      else if (ev.left != null && ev.total) seats = `${ev.left} of ${ev.total} seats left`;
      else if (ev.left != null) seats = `${ev.left} seats left`;
      const pct = ev.full ? 100 : (ev.left != null && ev.total ? Math.round((ev.total - ev.left) / ev.total * 100) : null);
      const seatsHtml = seats ? `<div class="seats">${pct != null ? `<span class="seat-bar"><i style="width:${pct}%"></i></span>` : ''}${seats}</div>` : '';

      const label = `<span class="sr-only"> for ${esc(ev.title)}</span>`;
      const action = ev.full
        ? `<button class="btn btn-small" data-event="${i}" data-action="waitlist">Join the waitlist${label}</button>`
        : ev.link
          ? `<a class="btn btn-small" href="${esc(ev.link)}" target="_blank" rel="noopener">Get tickets${label}</a>`
          : `<button class="btn btn-small" data-event="${i}" data-action="reserve">Reserve a seat${label}</button>`;

      return `<article class="event${ev.full ? ' is-full' : ''}">
        <div class="event-date"><div class="m">${month}</div><div class="d">${day}</div></div>
        <div>
          <h3>${esc(ev.title)}</h3>
          <p>${esc(when)}</p>
          ${ev.blurb ? `<p>${esc(ev.blurb)}</p>` : ''}
          ${seatsHtml}
        </div>
        <div class="event-buy">
          ${price ? `<p class="price">${price}</p>` : ''}
          ${action}
        </div>
      </article>`;
    }).join('');

    eventsEl.onclick = e => {
      const btn = e.target.closest('[data-event]');
      if (!btn) return;
      const ev = upcoming[+btn.dataset.event];
      const date = ev.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      prefillOrder('Cookie class or event', btn.dataset.action === 'waitlist'
        ? `Please add me to the waitlist for ${ev.title} on ${date}.`
        : `I'd like to reserve seats for ${ev.title} on ${date}. Number of seats: `);
    };
  }

  async function loadEvents() {
    $('#sampleNote').hidden = !!EVENTS_SHEET_CSV;
    eventsEl.innerHTML = '<p class="events-status">Loading the class calendar…</p>';
    try {
      const res = await fetch(EVENTS_SHEET_CSV || 'events.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      renderEvents(parseCSV(await res.text()).map(toEvent));
    } catch (e) {
      eventsEl.innerHTML = `<p class="events-status">The class calendar didn't load. Upcoming classes are posted on <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a>.</p>`;
    }
  }
  loadEvents();

  /* ---------------- order form ---------------- */
  const form = $('#orderForm'), success = $('#orderSuccess'), err = $('#formError');
  function prefillOrder(occasion, note) {
    $('#f-occasion').value = occasion;
    if (note) $('#f-theme').value = note;
    $('#order').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), 600);
  }
  $$('[data-occasion]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); prefillOrder(a.dataset.occasion);
  }));

  // date picker: no past dates
  $('#f-date').min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const required = $$('[required]', form);
    const bad = required.filter(f => !f.checkValidity());
    required.forEach(f => f.setAttribute('aria-invalid', bad.includes(f)));
    if (bad.length) {
      const names = bad.map(f => $(`label[for="${f.id}"]`).childNodes[0].textContent.trim().replace(/\?$/, '').toLowerCase());
      err.textContent = `Please fill in: ${names.join(', ')}.`;
      err.hidden = false;
      bad[0].focus();
      return;
    }
    err.hidden = true;
    // Live site: post to Jotform here (or swap this form for the Jotform embed).
    $('#successName').textContent = $('#f-name').value.trim().split(' ')[0] || 'friend';
    form.hidden = true; success.hidden = false; success.focus();
  });
  $('#orderAgain').addEventListener('click', () => {
    form.reset(); form.hidden = false; success.hidden = true;
    $$('[aria-invalid]', form).forEach(f => f.removeAttribute('aria-invalid'));
    $('#f-name').focus();
  });

  /* ---------------- boot ---------------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  const onResize = () => { measure(); resizeCanvas(); update(); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('load', onResize);
  document.fonts && document.fonts.ready.then(onResize);
  onResize();
})();
