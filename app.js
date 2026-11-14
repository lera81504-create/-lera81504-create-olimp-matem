/* Логика тренажёра: выбор задач, проверка ответов, таймер, статистика. */

const STORAGE_KEY = "olimpmatem-stats-v1";

const els = {
  tabs: document.querySelectorAll(".nav__btn"),
  tabSections: document.querySelectorAll(".tab"),
  headerStats: document.getElementById("headerStats"),
  headerDayStreak: document.getElementById("headerDayStreak"),
  dayToast: document.getElementById("dayToast"),
  topicSelect: document.getElementById("topicSelect"),
  levelSelect: document.getElementById("levelSelect"),
  startBtn: document.getElementById("startBtn"),
  randomBtn: document.getElementById("randomBtn"),
  resetBtn: document.getElementById("resetBtn"),
  problemCard: document.getElementById("problemCard"),
  problemTopic: document.getElementById("problemTopic"),
  problemLevel: document.getElementById("problemLevel"),
  problemTimer: document.getElementById("problemTimer"),
  problemText: document.getElementById("problemText"),
  answerRow: document.getElementById("answerRow"),
  answerInput: document.getElementById("answerInput"),
  checkBtn: document.getElementById("checkBtn"),
  feedback: document.getElementById("feedback"),
  hintBtn: document.getElementById("hintBtn"),
  solutionBtn: document.getElementById("solutionBtn"),
  nextBtn: document.getElementById("nextBtn"),
  hintBox: document.getElementById("hintBox"),
  hintText: document.getElementById("hintText"),
  solutionBox: document.getElementById("solutionBox"),
  solutionText: document.getElementById("solutionText"),
  statSolved: document.getElementById("statSolved"),
  statAttempts: document.getElementById("statAttempts"),
  statAccuracy: document.getElementById("statAccuracy"),
  statBestStreak: document.getElementById("statBestStreak"),
  catalogList: document.getElementById("catalogList")
};

let stats = loadStats();
let current = null;
let timerId = null;
let seconds = 0;

/* ---------- Статистика ---------- */

function defaultStats() {
  return {
    solvedBy: {},
    attempts: 0,
    solved: 0,
    streak: 0,
    bestStreak: 0,
    lastVisit: null,
    dayStreak: 0,
    bestDayStreak: 0
  };
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function updateDayStreak() {
  const today = localDateKey(new Date());
  if (stats.lastVisit === today) return;

  const yesterday = localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  stats.dayStreak = stats.lastVisit === yesterday ? stats.dayStreak + 1 : 1;
  stats.bestDayStreak = Math.max(stats.bestDayStreak, stats.dayStreak);
  stats.lastVisit = today;
  saveStats();

  els.dayToast.textContent =
    stats.dayStreak === 1
      ? "🔥 Первый день тренировки — серия начата!"
      : `🔥 Вы тренируетесь ${stats.dayStreak} дней подряд!`;
  showEl(els.dayToast);
  setTimeout(() => hideEl(els.dayToast), 5000);
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    return Object.assign(defaultStats(), JSON.parse(raw));
  } catch {
    return defaultStats();
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* приватный режим — статистика не сохранится */
  }
}

function statusOf(problemId) {
  return stats.solvedBy[problemId] || "new";
}

function renderStats() {
  const accuracy = stats.attempts
    ? Math.round((stats.solved / stats.attempts) * 100) + "%"
    : "—";
  els.headerStats.textContent = `Решено: ${stats.solved} · Серия: ${stats.streak}`;
  els.headerDayStreak.textContent = `🔥 ${stats.dayStreak}`;
  els.headerDayStreak.hidden = stats.dayStreak === 0;
  els.headerDayStreak.title = `Дней подряд: ${stats.dayStreak} · Рекорд: ${stats.bestDayStreak}`;
  els.statSolved.textContent = stats.solved;
  els.statAttempts.textContent = stats.attempts;
  els.statAccuracy.textContent = accuracy;
  els.statBestStreak.textContent = stats.bestStreak;
}

/* ---------- Выбор задачи ---------- */

function pool() {
  const topic = els.topicSelect.value;
  const level = els.levelSelect.value;
  return PROBLEMS.filter(
    (p) =>
      (topic === "all" || p.topic === topic) &&
      (level === "all" || String(p.level) === level)
  );
}

function pickProblem() {
  const list = pool();
  if (!list.length) return null;
  const fresh = list.filter((p) => statusOf(p.id) === "new");
  const source = fresh.length ? fresh : list;
  return source[Math.floor(Math.random() * source.length)];
}

/* ---------- Таймер ---------- */

function resetTimer() {
  clearInterval(timerId);
  seconds = 0;
  els.problemTimer.textContent = "00:00";
  timerId = setInterval(() => {
    seconds += 1;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    els.problemTimer.textContent = `${m}:${s}`;
  }, 1000);
}

/* ---------- Показ задачи ---------- */

function hideEl(el) {
  el.hidden = true;
}

function showEl(el) {
  el.hidden = false;
}

function showProblem(problem) {
  current = problem;
  hideEl(els.feedback);
  hideEl(els.hintBox);
  hideEl(els.solutionBox);
  els.problemTopic.textContent = TOPIC_NAMES[problem.topic];
  els.problemLevel.textContent = LEVEL_NAMES[problem.level];
  els.problemText.textContent = problem.text;
  els.answerRow.hidden = false;
  els.answerInput.value = "";
  els.answerInput.disabled = false;
  els.checkBtn.disabled = false;
  resetTimer();
  els.answerInput.focus();
}

/* ---------- Проверка ответа ---------- */

function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .replace(/−/g, "-")
    .trim();
}

function isCorrect(input, expected) {
  const given = normalize(input);
  return expected.split("|").some((variant) => normalize(variant) === given);
}

function checkAnswer() {
  if (!current) return;
  const input = els.answerInput.value;
  if (!input.trim()) {
    els.answerInput.focus();
    return;
  }

  stats.attempts += 1;

  if (isCorrect(input, current.answer)) {
    stats.solved += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    stats.solvedBy[current.id] = "solved";
    els.feedback.textContent = "✔ Верно! Отличная работа.";
    els.feedback.className = "feedback feedback--ok";
    clearInterval(timerId);
  } else {
    stats.streak = 0;
    if (stats.solvedBy[current.id] !== "solved") {
      stats.solvedBy[current.id] = "failed";
    }
    els.feedback.textContent = "✘ Пока неверно. Попробуйте ещё раз или откройте подсказку.";
    els.feedback.className = "feedback feedback--bad";
  }

  showEl(els.feedback);
  saveStats();
  renderStats();
}

/* ---------- Рендер каталога ---------- */

function renderCatalog() {
  els.catalogList.innerHTML = "";
  const groups = {};
  PROBLEMS.forEach((p) => {
    (groups[p.topic] = groups[p.topic] || []).push(p);
  });

  Object.entries(groups).forEach(([topic, list]) => {
    const block = document.createElement("div");
    block.className = "catalog-topic";
    const heading = document.createElement("h2");
    heading.style.fontSize = "1.2rem";
    heading.textContent = TOPIC_NAMES[topic];
    block.appendChild(heading);

    list.forEach((p) => {
      const item = document.createElement("article");
      item.className = "catalog-item";

      const meta = document.createElement("div");
      meta.className = "catalog-item__meta";
      const levelTag = document.createElement("span");
      levelTag.className = "tag tag--level";
      levelTag.textContent = LEVEL_NAMES[p.level];
      meta.appendChild(levelTag);

      const text = document.createElement("p");
      text.className = "catalog-item__text";
      text.textContent = p.text.split("\n")[0];

      const status = document.createElement("div");
      const st = statusOf(p.id);
      status.className = `catalog-item__status catalog-item__status--${st}`;
      status.textContent =
        st === "solved" ? "✔ решена" : st === "failed" ? "✘ была ошибка" : "не решалась";

      item.append(meta, text, status);
      item.addEventListener("click", () => {
        switchTab("trainer");
        showProblem(p);
      });
      block.appendChild(item);
    });

    els.catalogList.appendChild(block);
  });
}

/* ---------- Вкладки ---------- */

function switchTab(name) {
  els.tabs.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.tab === name)
  );
  els.tabSections.forEach((section) =>
    section.classList.toggle("is-visible", section.id === `tab-${name}`)
  );
  if (name === "catalog") renderCatalog();
}

/* ---------- События ---------- */

els.tabs.forEach((btn) =>
  btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

els.startBtn.addEventListener("click", () => {
  const problem = pickProblem();
  if (problem) {
    showProblem(problem);
  } else {
    els.problemText.textContent = "Нет задач с такими настройками. Измените тему или уровень.";
    els.answerRow.hidden = true;
  }
});

els.randomBtn.addEventListener("click", () => {
  els.topicSelect.value = "all";
  els.levelSelect.value = "all";
  const problem = pickProblem();
  if (problem) showProblem(problem);
});

els.checkBtn.addEventListener("click", checkAnswer);
els.answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});

els.hintBtn.addEventListener("click", () => {
  if (!current) return;
  els.hintText.textContent = current.hint;
  showEl(els.hintBox);
});

els.solutionBtn.addEventListener("click", () => {
  if (!current) return;
  els.solutionText.textContent = current.solution;
  showEl(els.solutionBox);
  clearInterval(timerId);
});

els.nextBtn.addEventListener("click", () => {
  const problem = pickProblem();
  if (problem) showProblem(problem);
});

els.resetBtn.addEventListener("click", () => {
  stats = defaultStats();
  saveStats();
  renderStats();
  renderCatalog();
});

/* ---------- Инициализация ---------- */
renderStats();
updateDayStreak();
renderStats();
