/* CourseQuest — gamified revision engine (vanilla JS, no build step).
 * Content lives in data/*.json. Progress is saved in this browser (localStorage). */
(() => {
  "use strict";

  // ---------------------------------------------------------------- config
  const MAX_HEARTS = 5;
  const HEART_REGEN_MS = 30 * 60 * 1000; // +1 heart every 30 min
  const XP_FIRST_TRY = 10;
  const XP_RETRY = 4;
  const XP_PERFECT_BONUS = 10;
  const XP_CHECKPOINT_PASS = 20;
  const CHECKPOINT_SIZE = 10;
  const CHECKPOINT_PASS = 0.8;
  const STORE_KEY = "coursequest-v1";

  // ---------------------------------------------------------------- state
  const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("sv-SE"); };

  const fresh = () => ({
    xp: 0, goal: 30, daily: { date: today(), xp: 0 },
    streak: { count: 0, last: null, best: 0 },
    hearts: MAX_HEARTS, heartsAt: Date.now(),
    sound: true, badges: [], courses: {}, perfects: 0, lessonsDone: 0,
  });

  let S = load();
  function load() {
    try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); }
    catch { return fresh(); }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* private mode */ } }
  function courseState(id) {
    if (!S.courses[id]) S.courses[id] = { lessons: {}, checkpoints: {}, mistakes: [] };
    return S.courses[id];
  }

  function regenHearts() {
    if (S.hearts >= MAX_HEARTS) { S.heartsAt = Date.now(); return; }
    const gained = Math.floor((Date.now() - S.heartsAt) / HEART_REGEN_MS);
    if (gained > 0) { S.hearts = Math.min(MAX_HEARTS, S.hearts + gained); S.heartsAt += gained * HEART_REGEN_MS; save(); }
  }
  function nextHeartIn() { return Math.max(0, HEART_REGEN_MS - (Date.now() - S.heartsAt)); }
  function rollDaily() { if (S.daily.date !== today()) S.daily = { date: today(), xp: 0 }; }
  function addXp(n) { rollDaily(); S.xp += n; S.daily.xp += n; }
  function touchStreak() {
    const t = today();
    if (S.streak.last === t) return;
    S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1;
    S.streak.last = t;
    S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
  }
  function liveStreak() { return (S.streak.last === today() || S.streak.last === yesterday()) ? S.streak.count : 0; }

  // ---------------------------------------------------------------- data
  const cache = {};
  async function getJSON(path) {
    if (!cache[path]) cache[path] = fetch(path, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
    return cache[path];
  }
  const getIndex = () => getJSON("data/courses.json");
  const getCourse = (id) => getJSON(`data/${id}.json`);
  function flatLessons(course) {
    const out = [];
    course.units.forEach((u) => u.lessons.forEach((l) => out.push({ unit: u, lesson: l })));
    return out;
  }
  function findExercise(course, id) {
    for (const u of course.units) for (const l of u.lessons) for (const e of l.exercises) if (e.id === id) return { ex: e, unit: u };
    return null;
  }

  // ---------------------------------------------------------------- utils
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmtTime = (ms) => { const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60; return `${m}:${String(s).padStart(2, "0")}`; };

  const ICONS = {
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>',
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10v2h4v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 15.9V19h3v2H8v-2h3v-3.1A5 5 0 0 1 7.6 13 5 5 0 0 1 3 8V5h4zm0 4H5v1a3 3 0 0 0 2 2.8zm10 0v3.8A3 3 0 0 0 19 8V7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  // ---------------------------------------------------------------- sound & fx
  let audio;
  function beep(kind) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === "good" ? [660, 880] : kind === "win" ? [523, 659, 784, 1046] : [220, 180];
      notes.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = kind === "bad" ? "sawtooth" : "triangle"; o.frequency.value = f;
        const t = audio.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch { /* audio unavailable */ }
  }
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = $("#confetti"), ctx = c.getContext("2d");
    c.width = innerWidth; c.height = innerHeight;
    const colors = ["#7b5cff", "#ffbf1f", "#22b573", "#ff5c8a", "#1aa3ff"];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, col: colors[(Math.random() * colors.length) | 0] }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.a += 0.1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
    })(t0);
  }
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------------------------------------------------------------- badges
  const BADGES = [
    { id: "first", e: "🌱", name: "Premier pas", desc: "Termine ta première leçon", test: () => S.lessonsDone >= 1 },
    { id: "perfect", e: "🎯", name: "Sans faute", desc: "Une leçon parfaite", test: () => S.perfects >= 1 },
    { id: "streak3", e: "🔥", name: "En feu", desc: "Série de 3 jours", test: () => (S.streak.best || 0) >= 3 },
    { id: "streak7", e: "📅", name: "Régulier", desc: "Série de 7 jours", test: () => (S.streak.best || 0) >= 7 },
    { id: "xp500", e: "⚡", name: "500 XP", desc: "Cumule 500 XP", test: () => S.xp >= 500 },
    { id: "checkpoint", e: "🏆", name: "Unité maîtrisée", desc: "Réussis un test d'unité", test: () => Object.values(S.courses).some((c) => Object.values(c.checkpoints).some((p) => p >= CHECKPOINT_PASS)) },
    { id: "lawyer", e: "⚖️", name: "Juriste", desc: "Termine toutes les leçons de Trademark Law", test: () => !!S.flags?.tmlComplete },
  ];
  function checkBadges() {
    BADGES.forEach((b) => {
      if (!S.badges.includes(b.id) && b.test()) { S.badges.push(b.id); setTimeout(() => toast(`${b.e} Badge débloqué : ${b.name}`), 900); }
    });
    save();
  }

  // ---------------------------------------------------------------- top bar
  function renderStats() {
    regenHearts();
    $("#streakVal").textContent = liveStreak();
    $("#statStreak").classList.toggle("dim", S.streak.last !== today());
    $("#xpVal").textContent = S.xp;
    $("#heartsVal").textContent = S.hearts;
  }
  $("#statStreak").onclick = () => (location.hash = "#/profile");
  $("#statXp").onclick = () => (location.hash = "#/profile");
  $("#statHearts").onclick = () => {
    regenHearts();
    toast(S.hearts >= MAX_HEARTS ? "Tes cœurs sont au maximum." : `Prochain cœur dans ${fmtTime(nextHeartIn())}. Une révision redonne aussi un cœur.`);
  };

  // ---------------------------------------------------------------- router
  window.addEventListener("hashchange", route);
  async function route() {
    stopSessionKeys();
    renderStats();
    window.scrollTo(0, 0);
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    try {
      if (parts[0] === "c" && parts[1]) return await viewCourse(parts[1]);
      if (parts[0] === "l" && parts[2]) return await startSession({ mode: "lesson", courseId: parts[1], lessonId: parts[2] });
      if (parts[0] === "t" && parts[2]) return await startSession({ mode: "checkpoint", courseId: parts[1], unitId: parts[2] });
      if (parts[0] === "p" && parts[1]) return await startSession({ mode: "practice", courseId: parts[1] });
      if (parts[0] === "profile") return viewProfile();
      return await viewHome();
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="empty"><h2>Contenu introuvable</h2><p class="muted">Vérifie ta connexion puis recharge la page.</p><a class="btn" href="#/">Accueil</a></div>`;
    }
  }

  // ---------------------------------------------------------------- views: home
  async function viewHome() {
    app.innerHTML = `<p class="loading">Chargement…</p>`;
    const idx = await getIndex();
    rollDaily();
    const pct = Math.min(100, Math.round((S.daily.xp / S.goal) * 100));
    const cards = await Promise.all(idx.courses.map(async (c) => {
      let progress = "";
      if (c.status === "live") {
        const course = await getCourse(c.id);
        const all = flatLessons(course), cs = courseState(c.id);
        const done = all.filter((x) => cs.lessons[x.lesson.id]).length;
        progress = `<div class="bar" aria-label="${done} leçons sur ${all.length}"><i style="width:${(done / all.length) * 100}%"></i></div><p>${done} / ${all.length} leçons</p>`;
      }
      return `<button type="button" class="course${c.status === "live" ? "" : " soon"}" style="--c:${c.color}" ${c.status === "live" ? `data-go="#/c/${c.id}"` : 'aria-disabled="true"'}>
        <div class="top"><span class="badge">${ICONS[c.icon] || ICONS.book}</span>${c.status === "live" ? `<span class="code">${esc(c.code)}</span>` : '<span class="chip-soon">Bientôt</span>'}</div>
        <h3>${esc(c.title)}</h3><p>${esc(c.tagline)}</p>${progress}</button>`;
    }));
    app.innerHTML = `
      <section class="hello">
        <h1>Révise en jouant</h1>
        <p>Des leçons de 3 minutes, des XP, une série à garder. Choisis un cours du ${esc(idx.semester)}.</p>
        <div class="goal">
          <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
          <div><h3>Objectif du jour : ${S.goal} XP</h3><p>${S.daily.xp} XP aujourd'hui · série de ${liveStreak()} jour${liveStreak() > 1 ? "s" : ""}</p></div>
        </div>
      </section>
      <section class="courses">${cards.join("")}</section>`;
    app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => (location.hash = b.dataset.go)));
  }

  // ---------------------------------------------------------------- views: course path
  const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];
  async function viewCourse(id) {
    const course = await getCourse(id);
    const cs = courseState(id);
    const all = flatLessons(course);
    const unlocked = (i) => i === 0 || !!cs.lessons[all[i - 1].lesson.id];
    const currentIdx = all.findIndex((x, i) => unlocked(i) && !cs.lessons[x.lesson.id]);
    let k = 0, html = "";
    course.units.forEach((u) => {
      const lessons = u.lessons.map((l) => ({ l, i: all.findIndex((x) => x.lesson.id === l.id) }));
      const doneCount = lessons.filter(({ l }) => cs.lessons[l.id]).length;
      const unitDone = doneCount === lessons.length;
      const cp = cs.checkpoints[u.id];
      html += `<section class="unit"><div class="unit-banner" style="--c:${u.color}"><div><small>${esc(u.session)}</small><h2>${esc(u.title)}</h2></div><span class="pct">${doneCount}/${lessons.length}</span></div><div class="path">`;
      lessons.forEach(({ l, i }) => {
        const st = cs.lessons[l.id], isUnlocked = unlocked(i), isCurrent = i === currentIdx;
        const cls = st ? "done" : isUnlocked ? "" : "locked";
        const stars = st ? `<div class="stars">${[1, 2, 3].map((n) => `<span class="${n <= st.stars ? "" : "off"}">⭐</span>`).join("")}</div>` : "";
        html += `<div class="node-wrap" style="transform:translateX(${OFFSETS[k++ % OFFSETS.length]}px)">
          ${isCurrent ? '<span class="start-bubble">Commencer</span>' : ""}
          <button type="button" class="node ${cls}${isCurrent ? " current" : ""}"${!st && isUnlocked ? ` style="--c:${u.color}"` : ""} ${isUnlocked ? `data-go="#/l/${id}/${l.id}"` : "disabled"} aria-label="${esc(l.title)}${st ? ", terminée" : isUnlocked ? "" : ", verrouillée"}">
            ${st ? ICONS.check : isUnlocked ? ICONS.star : ICONS.lock}</button>
          <span class="node-label">${esc(l.title)}</span>${stars}</div>`;
      });
      const cpPassed = cp >= CHECKPOINT_PASS;
      html += `<div class="node-wrap" style="transform:translateX(${OFFSETS[k++ % OFFSETS.length]}px)">
          <button type="button" class="node ${cpPassed ? "done" : unitDone ? "" : "locked"}"${!cpPassed && unitDone ? ` style="--c:${u.color}"` : ""} ${unitDone ? `data-go="#/t/${id}/${u.id}"` : "disabled"} aria-label="Test de l'unité">${unitDone ? ICONS.trophy : ICONS.lock}</button>
          <span class="node-label">Test de l'unité${cp != null ? ` · ${Math.round(cp * 100)}%` : ""}</span></div>`;
      html += `</div></section>`;
    });
    const nMistakes = cs.mistakes.length;
    app.innerHTML = `
      <div class="course-head"><div><button type="button" class="back" data-go="#/">← Cours</button><h1>${esc(course.title)} <span class="muted" style="font-size:.6em">${esc(course.code)}</span></h1></div></div>
      <div class="practice-card"><div><h3>Révision</h3><p>${nMistakes ? `${nMistakes} question${nMistakes > 1 ? "s" : ""} ratée${nMistakes > 1 ? "s" : ""} à revoir` : "Un mélange de questions déjà vues"} · sans perte de cœur · +1 ❤️</p></div>
        <button type="button" class="btn gold small" data-go="#/p/${id}" ${Object.keys(cs.lessons).length ? "" : "disabled"}>S'entraîner</button></div>
      ${html}
      <p class="muted center" style="margin-top:28px;font-size:13px">${esc(course.source)}</p>`;
    app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => (location.hash = b.dataset.go)));
    const cur = app.querySelector(".node.current");
    if (cur) cur.scrollIntoView({ block: "center" });
  }

  // ---------------------------------------------------------------- session engine
  let L = null; // current session
  let keyHandler = null;
  function stopSessionKeys() { if (keyHandler) document.removeEventListener("keydown", keyHandler); keyHandler = null; }

  async function startSession(opts) {
    const course = await getCourse(opts.courseId);
    const cs = courseState(opts.courseId);
    regenHearts();
    let items = [], title = "", color = "#7b5cff";
    if (opts.mode === "lesson") {
      const all = flatLessons(course);
      const i = all.findIndex((x) => x.lesson.id === opts.lessonId);
      if (i < 0) throw new Error("lesson");
      if (i > 0 && !cs.lessons[all[i - 1].lesson.id] && !cs.lessons[opts.lessonId]) { location.hash = `#/c/${opts.courseId}`; return; }
      if (S.hearts <= 0) return viewNoHearts(opts.courseId);
      const { unit, lesson } = all[i];
      title = lesson.title; color = unit.color;
      items = lesson.exercises.map((ex) => ({ ex, color: unit.color }));
    } else if (opts.mode === "checkpoint") {
      const unit = course.units.find((u) => u.id === opts.unitId);
      if (!unit || !unit.lessons.every((l) => cs.lessons[l.id])) { location.hash = `#/c/${opts.courseId}`; return; }
      title = `Test : ${unit.title}`; color = unit.color;
      items = shuffle(unit.lessons.flatMap((l) => l.exercises)).slice(0, CHECKPOINT_SIZE).map((ex) => ({ ex, color: unit.color }));
    } else {
      title = "Révision";
      const fromMistakes = cs.mistakes.map((id) => findExercise(course, id)).filter(Boolean);
      const seen = flatLessons(course).filter((x) => cs.lessons[x.lesson.id]).flatMap((x) => x.lesson.exercises.map((ex) => ({ ex, unit: x.unit })));
      const pool = fromMistakes.length >= 4 ? fromMistakes : fromMistakes.concat(shuffle(seen.filter((s) => !cs.mistakes.includes(s.ex.id))));
      items = shuffle(pool.slice(0, 8)).map(({ ex, unit }) => ({ ex, color: unit.color }));
      if (!items.length) { location.hash = `#/c/${opts.courseId}`; return; }
    }
    L = { ...opts, course, title, color, queue: items.slice(), total: items.length, done: 0, firstTry: 0, answered: 0,
      wrongIds: new Set(), xp: 0, combo: 0, maxCombo: 0, start: Date.now(), current: null, review: [] };
    keyHandler = onKey; document.addEventListener("keydown", keyHandler);
    nextExercise();
  }

  function nextExercise() {
    if (!L.queue.length) return finishSession();
    L.current = L.queue.shift();
    L.current.firstAttempt = !L.current.retried;
    renderExercise();
  }

  function header() {
    const pct = (L.done / L.total) * 100;
    const lives = L.mode === "lesson" ? `<span class="lives" aria-label="${S.hearts} cœurs">❤️ ${S.hearts}</span>` : `<span class="lives" style="color:var(--muted)">${L.mode === "checkpoint" ? "🏆" : "🔁"}</span>`;
    return `<div class="lesson-top"><button type="button" class="quit" id="quit" aria-label="Quitter">✕</button>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${L.total}" aria-valuenow="${L.done}"><i style="width:${pct}%"></i></div>${lives}</div>
      <div class="combo">${L.combo >= 3 ? `🔥 ${L.combo} bonnes réponses d'affilée` : ""}</div>`;
  }

  const KIND = { mcq: "Choisis la bonne réponse", tf: "Vrai ou faux ?", fill: "Complète la phrase", match: "Associe les paires" };

  function renderExercise() {
    const { ex } = L.current;
    const kind = ex.scenario ? "Cas pratique" : KIND[ex.type] || "";
    app.innerHTML = `<section class="lesson" style="--primary:${L.color}">${header()}
      <div class="ex-kind">${esc(kind)}${L.current.retried ? " · 2e essai" : ""}</div>
      ${ex.scenario ? `<div class="scenario">${esc(ex.scenario)}</div>` : ""}
      <h1 class="prompt" id="prompt">${ex.type === "fill" ? esc(KIND.fill) : esc(ex.prompt)}</h1>
      <div id="area"></div></section>
      <footer class="footer" id="footer"><div class="inner"><div class="fb" id="fb"></div><button type="button" class="btn" id="mainBtn" disabled>Vérifier</button></div></footer>`;
    $("#quit").onclick = quitSession;
    const area = $("#area");
    const st = (L.current.ui = { answer: null, locked: false });
    const main = $("#mainBtn");
    const ready = (ok) => { main.disabled = !ok; };

    if (ex.type === "mcq") {
      st.order = shuffle(ex.choices.map((t, i) => ({ t, i })));
      area.innerHTML = `<div class="options" role="radiogroup" aria-labelledby="prompt">${st.order.map((o, k) => `<button type="button" class="opt" role="radio" aria-checked="false" data-k="${k}"><span class="k">${k + 1}</span><span>${esc(o.t)}</span></button>`).join("")}</div>`;
      area.querySelectorAll(".opt").forEach((b) => (b.onclick = () => selectOpt(+b.dataset.k)));
      st.select = (k) => { st.answer = k; area.querySelectorAll(".opt").forEach((b, j) => { b.classList.toggle("sel", j === k); b.setAttribute("aria-checked", j === k); }); ready(true); };
    } else if (ex.type === "tf") {
      st.order = [{ t: "Vrai", v: true }, { t: "Faux", v: false }];
      area.innerHTML = `<div class="options tf" role="radiogroup" aria-labelledby="prompt">${st.order.map((o, k) => `<button type="button" class="opt" role="radio" aria-checked="false" data-k="${k}">${o.t}</button>`).join("")}</div>`;
      area.querySelectorAll(".opt").forEach((b) => (b.onclick = () => selectOpt(+b.dataset.k)));
      st.select = (k) => { st.answer = k; area.querySelectorAll(".opt").forEach((b, j) => { b.classList.toggle("sel", j === k); b.setAttribute("aria-checked", j === k); }); ready(true); };
    } else if (ex.type === "fill") {
      const parts = ex.prompt.split("___");
      st.slots = Array(parts.length - 1).fill(null);
      st.bank = shuffle(ex.bank.map((w, i) => ({ w, i })));
      const draw = () => {
        area.innerHTML = `<p class="sentence">${parts.map((p, i) => esc(p) + (i < st.slots.length ? `<button type="button" class="slot${st.slots[i] != null ? " filled" : ""}" data-s="${i}" aria-label="Case ${i + 1}">${st.slots[i] != null ? esc(st.bank.find((b) => b.i === st.slots[i]).w) : ""}</button>` : "")).join("")}</p>
          <div class="bank">${st.bank.map((b) => `<button type="button" class="word${st.slots.includes(b.i) ? " used" : ""}" data-i="${b.i}">${esc(b.w)}</button>`).join("")}</div>`;
        area.querySelectorAll(".word").forEach((w) => (w.onclick = () => { if (st.locked) return; const free = st.slots.indexOf(null); if (free < 0) return; st.slots[free] = +w.dataset.i; draw(); }));
        area.querySelectorAll(".slot").forEach((s) => (s.onclick = () => { if (st.locked) return; st.slots[+s.dataset.s] = null; draw(); }));
        ready(st.slots.every((v) => v != null));
      };
      st.draw = draw; draw();
    } else if (ex.type === "match") {
      st.left = shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
      st.right = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
      st.matched = new Set(); st.sel = null; st.mistake = false;
      area.innerHTML = `<div class="match"><div class="col">${st.left.map((x) => `<button type="button" class="tile" data-side="L" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div>
        <div class="col">${st.right.map((x) => `<button type="button" class="tile" data-side="R" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div></div>`;
      main.hidden = true;
      area.querySelectorAll(".tile").forEach((t) => (t.onclick = () => tapTile(t)));
    }
    main.onclick = () => (st.locked ? nextExercise() : check());
  }

  function selectOpt(k) { const st = L.current.ui; if (!st.locked) st.select(k); }

  function tapTile(t) {
    const st = L.current.ui;
    if (st.locked || t.classList.contains("ok")) return;
    const side = t.dataset.side, i = +t.dataset.i;
    if (!st.sel || st.sel.side === side) {
      $("#area").querySelectorAll(`.tile[data-side="${side}"]`).forEach((x) => x.classList.remove("sel"));
      t.classList.add("sel"); st.sel = { side, i, el: t }; return;
    }
    const a = st.sel; st.sel = null;
    if (a.i === i) {
      a.el.classList.remove("sel"); a.el.classList.add("ok"); t.classList.add("ok"); st.matched.add(i); beep("good");
      if (st.matched.size === L.current.ex.pairs.length) setTimeout(() => resolve(!st.mistake, null), 350);
    } else {
      st.mistake = true; a.el.classList.remove("sel");
      [a.el, t].forEach((x) => { x.classList.add("no"); setTimeout(() => x.classList.remove("no"), 400); });
      beep("bad");
    }
  }

  function check() {
    const { ex, ui: st } = L.current;
    let ok = false, correctText = "";
    if (ex.type === "mcq") {
      ok = st.order[st.answer].i === ex.answer;
      correctText = ex.choices[ex.answer];
      $("#area").querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (st.order[j].i === ex.answer) b.classList.add("right"); else if (j === st.answer) b.classList.add("wrong"); });
    } else if (ex.type === "tf") {
      ok = st.order[st.answer].v === ex.answer;
      correctText = ex.answer ? "Vrai" : "Faux";
      $("#area").querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (st.order[j].v === ex.answer) b.classList.add("right"); else if (j === st.answer) b.classList.add("wrong"); });
    } else if (ex.type === "fill") {
      const words = st.slots.map((i) => ex.bank[i]);
      ok = words.every((w, k) => w === ex.answer[k]);
      correctText = ex.answer.join(" · ");
      st.locked = true;
      $("#area").querySelectorAll(".slot").forEach((s, k) => s.classList.add(words[k] === ex.answer[k] ? "right" : "wrong"));
    }
    resolve(ok, correctText);
  }

  function resolve(ok, correctText) {
    const cur = L.current, ex = cur.ex, st = cur.ui;
    st.locked = true;
    L.answered++;
    const footer = $("#footer"), main = $("#mainBtn");
    main.hidden = false; main.disabled = false;
    if (ok) {
      L.done++;
      L.combo++; L.maxCombo = Math.max(L.maxCombo, L.combo);
      if (cur.firstAttempt) L.firstTry++;
      const gain = L.mode === "practice" ? 5 : cur.firstAttempt ? XP_FIRST_TRY : XP_RETRY;
      L.xp += gain;
      if (L.mode === "practice") { const cs = courseState(L.courseId); cs.mistakes = cs.mistakes.filter((id) => id !== ex.id); }
      beep("good");
      footer.className = "footer good";
      $("#fb").innerHTML = `<h3>${L.combo >= 3 ? "Excellent !" : "Bien joué !"}</h3><p>${esc(ex.explain || "")}</p>`;
      main.className = "btn good";
    } else {
      L.combo = 0;
      L.wrongIds.add(ex.id);
      const cs = courseState(L.courseId);
      if (!cs.mistakes.includes(ex.id)) cs.mistakes.push(ex.id);
      if (L.mode === "lesson") { regenHearts(); if (S.hearts === MAX_HEARTS) S.heartsAt = Date.now(); S.hearts = Math.max(0, S.hearts - 1); }
      if (L.mode === "checkpoint") { L.done++; L.review.push(ex); }
      else { cur.retried = true; L.queue.push(cur); } // try again at the end
      beep("bad");
      footer.className = "footer bad";
      const sol = ex.type === "match" ? "Tu as fait au moins une erreur d'association." : `Bonne réponse : ${esc(correctText)}`;
      $("#fb").innerHTML = `<h3>${ex.type === "match" ? "Presque !" : "Pas tout à fait"}</h3><p><b>${sol}</b><br>${esc(ex.explain || "")}</p>`;
      main.className = "btn bad";
    }
    save(); renderStats();
    const bar = $(".progress i"); if (bar) bar.style.width = `${(L.done / L.total) * 100}%`;
    const lives = $(".lives"); if (lives && L.mode === "lesson") lives.textContent = `❤️ ${S.hearts}`;
    main.textContent = "Continuer";
    main.onclick = () => {
      if (L.mode === "lesson" && S.hearts <= 0 && !ok) return viewNoHearts(L.courseId);
      nextExercise();
    };
    main.focus();
  }

  function onKey(e) {
    if (!L || !L.current) return;
    const st = L.current.ui; if (!st) return;
    if (e.key === "Enter") { const m = $("#mainBtn"); if (m && !m.disabled && !m.hidden) { e.preventDefault(); m.click(); } return; }
    if (st.locked) return;
    const n = parseInt(e.key, 10);
    if ((L.current.ex.type === "mcq" || L.current.ex.type === "tf") && n >= 1 && n <= st.order.length) selectOpt(n - 1);
  }

  let quitArmed = false;
  function quitSession() {
    if (!quitArmed && L.answered > 0) { quitArmed = true; toast("Clique encore sur ✕ pour quitter : ta progression dans cette leçon sera perdue."); setTimeout(() => (quitArmed = false), 3000); return; }
    quitArmed = false; save(); location.hash = `#/c/${L.courseId}`;
  }

  function finishSession() {
    stopSessionKeys();
    const cs = courseState(L.courseId);
    const acc = L.total ? L.firstTry / L.total : 1;
    let title = "Leçon terminée !", sub = "", bonus = 0, passed = true;
    if (L.mode === "lesson") {
      const perfect = L.wrongIds.size === 0;
      if (perfect) { bonus += XP_PERFECT_BONUS; S.perfects++; }
      const stars = acc >= 0.95 ? 3 : acc >= 0.75 ? 2 : 1;
      const prev = cs.lessons[L.lessonId];
      cs.lessons[L.lessonId] = { stars: Math.max(stars, prev?.stars || 0), best: Math.max(acc, prev?.best || 0), plays: (prev?.plays || 0) + 1 };
      S.lessonsDone++;
      sub = perfect ? "Sans faute : bonus de 10 XP." : `${L.wrongIds.size} question${L.wrongIds.size > 1 ? "s" : ""} à revoir en révision.`;
      if (L.courseId === "trademark-law" && flatLessons(L.course).every((x) => cs.lessons[x.lesson.id])) { S.flags = { ...(S.flags || {}), tmlComplete: true }; }
    } else if (L.mode === "checkpoint") {
      passed = acc >= CHECKPOINT_PASS;
      cs.checkpoints[L.unitId] = Math.max(acc, cs.checkpoints[L.unitId] || 0);
      title = passed ? "Unité maîtrisée !" : "Pas encore…";
      sub = passed ? `Bonus de ${XP_CHECKPOINT_PASS} XP.` : `Il faut ${Math.round(CHECKPOINT_PASS * 100)}% pour valider. Révise et retente.`;
      if (passed) bonus += XP_CHECKPOINT_PASS;
    } else {
      title = "Révision terminée !";
      if (S.hearts < MAX_HEARTS) { S.hearts++; sub = "+1 ❤️ récupéré."; } else sub = "Tes cœurs sont déjà au maximum.";
    }
    L.xp += bonus;
    addXp(L.xp);
    touchStreak();
    save(); checkBadges(); renderStats();
    if (passed) { beep("win"); confetti(); }
    const secs = Math.round((Date.now() - L.start) / 1000);
    const review = L.mode === "checkpoint" && L.review.length ? `<div class="review-list"><h3>À revoir</h3>${L.review.map((ex) => `<div class="review-item"><b>${esc(ex.type === "fill" ? ex.prompt : ex.prompt)}</b><p class="ans">${esc(answerText(ex))}</p><p>${esc(ex.explain || "")}</p></div>`).join("")}</div>` : "";
    app.innerHTML = `<section class="result">
      <svg class="trophy" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:${passed ? "var(--gold)" : "var(--locked-dark)"}">${ICONS.trophy.replace(/<\/?svg[^>]*>/g, "")}</svg>
      <h1 style="${passed ? "" : "color:var(--muted)"}">${title}</h1><p class="muted">${sub}</p>
      <div class="result-stats">
        <div class="rs" style="--c:var(--gold)"><small>XP gagnés</small><b>+${L.xp}</b></div>
        <div class="rs" style="--c:var(--good)"><small>Précision</small><b>${Math.round(acc * 100)}%</b></div>
        <div class="rs" style="--c:#1aa3ff"><small>Temps</small><b>${fmtTime(secs * 1000)}</b></div>
      </div>
      <p class="muted">🔥 Série : ${liveStreak()} jour${liveStreak() > 1 ? "s" : ""} · Objectif du jour : ${Math.min(S.daily.xp, S.goal)}/${S.goal} XP${L.maxCombo >= 3 ? ` · Meilleur combo : ${L.maxCombo}` : ""}</p>
      ${review}
      <div class="actions"><button type="button" class="btn wide" id="cont">Continuer</button>
      ${L.mode === "checkpoint" && !passed ? `<button type="button" class="btn ghost wide" id="again">Retenter le test</button>` : ""}</div></section>`;
    const id = L.courseId, unitId = L.unitId;
    $("#cont").onclick = () => (location.hash = `#/c/${id}`);
    const again = $("#again"); if (again) again.onclick = () => startSession({ mode: "checkpoint", courseId: id, unitId });
    $("#cont").focus();
    L = null;
  }

  function answerText(ex) {
    if (ex.type === "mcq") return `Réponse : ${ex.choices[ex.answer]}`;
    if (ex.type === "tf") return `Réponse : ${ex.answer ? "Vrai" : "Faux"}`;
    if (ex.type === "fill") return `Réponse : ${ex.answer.join(" · ")}`;
    if (ex.type === "match") return ex.pairs.map((p) => `${p[0]} → ${p[1]}`).join(" | ");
    return "";
  }

  function viewNoHearts(courseId) {
    stopSessionKeys(); L = null;
    regenHearts();
    app.innerHTML = `<section class="empty"><div style="font-size:64px">💔</div><h1>Plus de cœurs</h1>
      <p class="muted">Prochain cœur dans <b id="cd">${fmtTime(nextHeartIn())}</b>. Une révision sans faute te redonne un cœur tout de suite.</p>
      <button type="button" class="btn gold" id="prac">S'entraîner (+1 ❤️)</button>
      <button type="button" class="btn ghost" id="back">Retour au parcours</button></section>`;
    $("#prac").onclick = () => (location.hash = `#/p/${courseId}`);
    $("#back").onclick = () => (location.hash = `#/c/${courseId}`);
    const timer = setInterval(() => { const cd = $("#cd"); if (!cd) return clearInterval(timer); regenHearts(); renderStats(); if (S.hearts > 0) { clearInterval(timer); location.hash = `#/c/${courseId}`; } else cd.textContent = fmtTime(nextHeartIn()); }, 1000);
  }

  // ---------------------------------------------------------------- profile
  let resetArmed = false;
  function viewProfile() {
    const lessons = Object.values(S.courses).reduce((n, c) => n + Object.keys(c.lessons).length, 0);
    app.innerHTML = `<section class="profile">
      <div><button type="button" class="back" id="back">← Accueil</button><h1>Ton profil</h1></div>
      <div class="cards3">
        <div class="kpi"><b>⚡ ${S.xp}</b><span>XP au total</span></div>
        <div class="kpi"><b>🔥 ${liveStreak()}</b><span>Série · record ${S.streak.best || 0}</span></div>
        <div class="kpi"><b>📘 ${lessons}</b><span>Leçons terminées</span></div>
      </div>
      <div><h2 style="font-size:20px;margin-bottom:10px">Objectif quotidien</h2><div class="settings">
        ${[10, 20, 30, 50].map((g) => `<button type="button" class="btn small ${S.goal === g ? "" : "ghost"}" data-goal="${g}">${g} XP</button>`).join("")}</div></div>
      <div><h2 style="font-size:20px;margin-bottom:10px">Badges</h2><div class="badges">
        ${BADGES.map((b) => `<div class="bdg${S.badges.includes(b.id) ? "" : " off"}"><span class="e">${b.e}</span><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}</div></div>
      <div class="settings">
        <button type="button" class="btn ghost small" id="sound">${S.sound ? "🔊 Son activé" : "🔇 Son coupé"}</button>
        <button type="button" class="btn ghost small" id="reset">Réinitialiser ma progression</button>
      </div>
      <p class="muted" style="font-size:13px">Ta progression est enregistrée dans ce navigateur uniquement.</p></section>`;
    $("#back").onclick = () => (location.hash = "#/");
    app.querySelectorAll("[data-goal]").forEach((b) => (b.onclick = () => { S.goal = +b.dataset.goal; save(); viewProfile(); }));
    $("#sound").onclick = () => { S.sound = !S.sound; save(); viewProfile(); };
    $("#reset").onclick = () => {
      if (!resetArmed) { resetArmed = true; $("#reset").textContent = "Clique encore pour tout effacer"; setTimeout(() => { resetArmed = false; const r = $("#reset"); if (r) r.textContent = "Réinitialiser ma progression"; }, 3500); return; }
      resetArmed = false; S = fresh(); save(); renderStats(); toast("Progression réinitialisée."); viewProfile();
    };
  }

  // ---------------------------------------------------------------- boot
  setInterval(renderStats, 30000);
  route();
})();
