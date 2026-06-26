/* ============================================================
   MEGA Garage Door & Gates — Shared JS
   ============================================================ */

// ── Mobile nav ──────────────────────────────────────────────
function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const nav = document.getElementById('navLinks');
  if (nav && !e.target.closest('.navbar')) nav.classList.remove('open');
});

// ── Active nav link (path-based) ────────────────────────────
(function () {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path) a.classList.add('active');
    else a.classList.remove('active');
  });
})();

// ── Smooth scroll for anchor links ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 4200);
}

// ── Modal helpers ─────────────────────────────────────────────
function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.classList.remove('show');
}
document.addEventListener('click', function(e) {
  const m = document.getElementById('modal');
  if (m && e.target === m) closeModal();
});
