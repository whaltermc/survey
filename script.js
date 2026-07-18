// script.js
// Shared logic for both the survey page and the analytics page.
// Which section runs is decided automatically by which elements exist on the page.
//
// This talks to a small set of Vercel serverless functions (see /api) backed by
// MongoDB, instead of talking to Firebase directly from the browser. See
// .env.example for the environment variables those functions need.

const API = {
  submit: "/api/submit-response",
  responses: "/api/responses",
  login: "/api/login",
  logout: "/api/logout"
};

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { ok: res.ok, status: res.status, data };
}

// ── Survey page (legacy 3-question layout: q1/q2/q3) ────────────
// Kept for compatibility with markup that uses #step1/#step2/#step3/#stepDone.
// The current index.html uses a different, longer question set and posts its
// own answers directly (see the inline script at the bottom of index.html) —
// this function simply won't run on that page since #step1 doesn't exist there.
function initSurvey() {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const stepDone = document.getElementById('stepDone');
  const steps = [step1, step2, step3, stepDone];
  const progress = [document.getElementById('p1'), document.getElementById('p2'), document.getElementById('p3')];
  const status3 = document.getElementById('status3');

  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
    progress.forEach((p, idx) => p.classList.toggle('done', idx <= i));
  }

  const q1Boxes = document.querySelectorAll('input[name="q1"]');
  const next1 = document.getElementById('next1');
  q1Boxes.forEach(box => {
    box.addEventListener('change', () => {
      if (box.value === 'None of these' && box.checked) {
        q1Boxes.forEach(b => { if (b !== box) b.checked = false; });
      } else if (box.checked) {
        document.querySelector('input[name="q1"][value="None of these"]').checked = false;
      }
      next1.disabled = ![...q1Boxes].some(b => b.checked);
    });
  });
  next1.addEventListener('click', () => showStep(1));

  const q2Radios = document.querySelectorAll('input[name="q2"]');
  const next2 = document.getElementById('next2');
  q2Radios.forEach(r => r.addEventListener('change', () => next2.disabled = false));
  document.getElementById('back2').addEventListener('click', () => showStep(0));
  next2.addEventListener('click', () => showStep(2));

  document.getElementById('back3').addEventListener('click', () => showStep(1));

  const next3 = document.getElementById('next3');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmSubmit = document.getElementById('confirmSubmit');

  // "Finish" just opens the confirmation modal — it doesn't submit anything yet
  next3.addEventListener('click', () => {
    confirmOverlay.classList.add('active');
  });

  confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('active');
  });

  // Actual submission only happens once the user confirms
  confirmSubmit.addEventListener('click', async () => {
    const habits = [...q1Boxes].filter(b => b.checked).map(b => b.value);
    const introducedBy = document.querySelector('input[name="q2"]:checked')?.value || '';
    const reflection = document.getElementById('q3').value.trim();

    confirmSubmit.disabled = true;
    confirmCancel.disabled = true;
    status3.className = 'status saving';
    status3.innerHTML = '<span class="spinner"></span>Saving your response…';

    const { ok } = await postJSON(API.submit, { habits, introducedBy, reflection });

    if (ok) {
      status3.textContent = '';
      document.getElementById('summaryBox').innerHTML = `
        <div><b>Habit(s):</b> ${habits.join(', ') || '—'}</div>
        <div><b>Introduced by:</b> ${introducedBy || '—'}</div>
        <div><b>Your reflection:</b> ${reflection || '(no answer given)'}</div>
      `;
      confirmOverlay.classList.remove('active');
      confirmSubmit.disabled = false;
      confirmCancel.disabled = false;
      showStep(3);
    } else {
      status3.className = 'status error';
      status3.textContent = "Couldn't save your response. Check your connection and try again.";
      confirmSubmit.disabled = false;
      confirmCancel.disabled = false;
    }
  });

  document.getElementById('restart').addEventListener('click', () => {
    q1Boxes.forEach(b => b.checked = false);
    q2Radios.forEach(r => r.checked = false);
    document.getElementById('q3').value = '';
    next1.disabled = true;
    next2.disabled = true;
    status3.textContent = '';
    showStep(0);
  });
}

// ── Analytics page ─────────────────────────────────────────────
// Question definitions mirror the fields collected by index.html's form.
// Each drives one card on the dashboard: "bar" for single/multi-select
// questions, "number" for the two age fields, "text" for open-ended answers.
const QUESTIONS = [
  { key: 'kasarian',        label: 'Kasarian',                          type: 'bar' },
  { key: 'edad',            label: 'Edad',                              type: 'number' },
  { key: 'karanasan',       label: 'Karanasan sa Bisyo',                type: 'bar', other: 'karanasan_other' },
  { key: 'kasalukuyan',     label: 'Kasalukuyang May Bisyo?',           type: 'bar' },
  { key: 'edad_simula',     label: 'Edad Nang Nagsimula',               type: 'number' },
  { key: 'dahilan_simula',  label: 'Dahilan sa Pagsisimula',            type: 'bar', other: 'dahilan_simula_other' },
  { key: 'naisip_subukan',  label: 'Naisip Subukan?',                   type: 'bar' },
  { key: 'dahilan_naisip',  label: 'Dahilan Kung Oo',                   type: 'bar', other: 'dahilan_naisip_other' },
  { key: 'dahilan_iwas',    label: 'Dahilan sa Pag-iwas',               type: 'bar', other: 'dahilan_iwas_other' },
  { key: 'epekto',          label: 'Epekto ng Bisyo sa Kabataan',       type: 'bar' },
  { key: 'barkada',         label: 'Impluwensya ng Barkada',            type: 'bar' },
  { key: 'paraan',          label: 'Pinakamabisang Paraan',             type: 'text' },
  { key: 'karagdagan',      label: 'Karagdagang Opinyon',               type: 'text' },
  { key: 'natutunan',       label: 'Natutunan sa Karanasan',            type: 'text' },
  { key: 'payo',            label: 'Payo Para sa Ibang Kabataan',       type: 'text' }
];

const PALETTE = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', 'var(--accent4)', 'var(--accent5)', '#B9B0A0'];

function initAnalytics() {
  function timeAgo(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function statCard(value, label) {
    return `<div class="stat"><div class="num">${value}</div><div class="label">${label}</div></div>`;
  }

  function renderBarRows(counts, answered) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '<div class="empty">No data yet.</div>';
    return entries.map(([label, count], i) => {
      const pct = answered ? Math.round((count / answered) * 100) : 0;
      const color = PALETTE[i % PALETTE.length];
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${label}</span><span class="count">${count} · ${pct}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${color}"></div></div>
        </div>`;
    }).join('');
  }

  function renderOtherNotes(docs, otherKey) {
    const notes = docs.map(d => d[otherKey]).filter(v => v && String(v).trim());
    if (notes.length === 0) return '';
    return `<div class="other-notes"><b>"Iba pa" na sagot:</b> ${notes.map(n => `<span class="chip">${n}</span>`).join(' ')}</div>`;
  }

  function buildBarCard(q, docs) {
    const counts = {};
    let answered = 0;
    docs.forEach(d => {
      const v = d[q.key];
      if (v == null || v === '') return;
      const list = Array.isArray(v) ? v : [v];
      const nonEmpty = list.filter(Boolean);
      if (nonEmpty.length === 0) return;
      answered++;
      nonEmpty.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    });
    return `
      <div class="card qcard">
        <h2>${q.label}</h2>
        ${renderBarRows(counts, answered)}
        ${q.other ? renderOtherNotes(docs, q.other) : ''}
      </div>`;
  }

  function buildNumberCard(q, docs) {
    const vals = docs.map(d => Number(d[q.key])).filter(v => Number.isFinite(v) && v > 0);
    const body = vals.length
      ? `
        <div class="grid grid-3">
          ${statCard(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), 'Average')}
          ${statCard(Math.min(...vals), 'Youngest')}
          ${statCard(Math.max(...vals), 'Oldest')}
        </div>`
      : '<div class="empty">No data yet.</div>';
    return `<div class="card qcard"><h2>${q.label}</h2>${body}</div>`;
  }

  function buildTextCard(q, docs) {
    const entries = docs
      .filter(d => d[q.key] && String(d[q.key]).trim())
      .map(d => ({ value: d[q.key], createdAt: d.createdAt }));
    const body = entries.length
      ? entries.map(e => `
          <div class="reflection">
            <div class="meta">${timeAgo(e.createdAt)}</div>
            <div>${e.value}</div>
          </div>`).join('')
      : '<div class="empty">No answers yet.</div>';
    return `<div class="card qcard"><h2>${q.label}</h2><div class="reflections">${body}</div></div>`;
  }

  function render(docs) {
    const total = docs.length;
    const withVice = docs.filter(d => d.kasalukuyan === 'Oo').length;
    const consideredTrying = docs.filter(d => d.naisip_subukan === 'Oo').length;

    document.getElementById('statsGrid').innerHTML = [
      statCard(total, 'Total responses'),
      statCard(total ? Math.round((withVice / total) * 100) + '%' : '—', 'Kasalukuyang may bisyo'),
      statCard(total ? Math.round((consideredTrying / total) * 100) + '%' : '—', 'Naisip subukan')
    ].join('');

    const container = document.getElementById('questionsContainer');
    container.innerHTML = docs.length === 0
      ? '<div class="card"><div class="empty">No responses yet.</div></div>'
      : QUESTIONS.map(q => {
          if (q.type === 'bar') return buildBarCard(q, docs);
          if (q.type === 'number') return buildNumberCard(q, docs);
          return buildTextCard(q, docs);
        }).join('');
  }

  async function loadData() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    loading.style.display = 'block';
    loading.className = 'status';
    loading.textContent = 'Loading responses…';
    content.style.display = 'none';

    try {
      const res = await fetch(API.responses);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const { responses } = await res.json();
      render(responses);
      loading.style.display = 'none';
      content.style.display = 'block';
    } catch (err) {
      console.error(err);
      loading.className = 'status error';
      loading.textContent = "Couldn't load responses. Check your MongoDB config and that you're signed in.";
    }
  }

  document.getElementById('refreshBtn').addEventListener('click', loadData);

  return { loadData };
}

// ── Analytics login gate ────────────────────────────────────────
// Replaces Firebase Auth's onAuthStateChanged with a simple check against
// the signed session cookie the login API sets.
function initAnalyticsAuth() {
  const loginScreen = document.getElementById('loginScreen');
  const analyticsWrap = document.getElementById('analyticsWrap');
  const passwordInput = document.getElementById('adminPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginStatus = document.getElementById('loginStatus');
  const logoutBtn = document.getElementById('logoutBtn');

  let analytics = null; // set up only after first successful login

  function showDashboard() {
    loginScreen.style.display = 'none';
    analyticsWrap.style.display = 'block';
    loginStatus.textContent = '';
    passwordInput.value = '';
    loginBtn.disabled = false;
    if (!analytics) {
      analytics = initAnalytics();
    }
    analytics.loadData();
  }

  function showLogin() {
    loginScreen.style.display = 'block';
    analyticsWrap.style.display = 'none';
  }

  async function attemptLogin() {
    const password = passwordInput.value;
    if (!password) return;
    loginBtn.disabled = true;
    loginStatus.className = 'status saving';
    loginStatus.innerHTML = '<span class="spinner"></span>Signing in…';
    const { ok, status } = await postJSON(API.login, { password });
    if (ok) {
      showDashboard();
    } else {
      loginStatus.className = 'status error';
      loginStatus.textContent = status === 401 ? 'Incorrect password.' : 'Something went wrong. Try again.';
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', attemptLogin);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

  logoutBtn.addEventListener('click', async () => {
    await postJSON(API.logout, {});
    showLogin();
  });

  // On load, the only way to know whether the session cookie is still valid
  // is to ask a protected endpoint. /api/responses doubles as that check.
  (async function checkExistingSession() {
    try {
      const res = await fetch(API.responses);
      if (res.ok) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  })();
}

// ── Router: run whichever page we're on ────────────────────────
if (document.getElementById('step1')) {
  initSurvey();
} else if (document.getElementById('loginScreen')) {
  initAnalyticsAuth();
}
