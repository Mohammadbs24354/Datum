const TASKS_KEY = "datum-tasks-v1";
const NOTES_KEY = "datum-quick-notes-v1";
const FOCUS_DURATION = 25 * 60;
let taskFilter = "all";
let focusRemaining = FOCUS_DURATION;
let focusInterval = null;

class ProductivityManager {
readTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => task && typeof task.id === "string" &&
      typeof task.title === "string" && typeof task.completed === "boolean" &&
      ["low", "normal", "high"].includes(task.priority));
  } catch { return []; }
}

persistTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks.slice(0, 200)));
    return true;
  } catch { return false; }
}

renderTasks() {
  const tasks = readTasks();
  const completed = tasks.filter(task => task.completed).length;
  document.getElementById("task-total").textContent = tasks.length;
  document.getElementById("task-open").textContent = tasks.length - completed;
  document.getElementById("task-completed").textContent = completed;
  document.getElementById("task-progress").textContent = (tasks.length ? Math.round(completed / tasks.length * 100) : 0) + "%";
  const visible = tasks.filter(task => taskFilter === "all" || (taskFilter === "open" ? !task.completed : task.completed));
  const list = document.getElementById("task-list");
  if (!visible.length) {
    list.innerHTML = '<p class="empty-state">' + (tasks.length ? "لا توجد مهام في هذا العرض." : "لا توجد مهام بعد. أضف أول مهمة لتبدأ.") + '</p>';
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  list.innerHTML = visible.map(task => {
    const due = task.due ? new Date(task.due + "T12:00:00") : null;
    const overdue = due && due < today && !task.completed;
    const dueLabel = due ? new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", year: "numeric" }).format(due) : "دون موعد";
    const priorityLabel = task.priority === "high" ? "عالية" : task.priority === "low" ? "منخفضة" : "عادية";
    return '<article class="task-item' + (task.completed ? ' is-complete' : '') + '">' +
      '<label class="task-check"><input type="checkbox" data-task-complete="' + escapeHtml(task.id) + '"' + (task.completed ? " checked" : "") + '><span class="visually-hidden">إكمال ' + escapeHtml(task.title) + '</span></label>' +
      '<div class="task-copy"><strong>' + escapeHtml(task.title) + '</strong><small class="' + (overdue ? "overdue" : "") + '">' + (overdue ? "متأخرة · " : "الموعد · ") + dueLabel + '</small></div>' +
      '<span class="priority-tag priority-' + task.priority + '">أولوية ' + priorityLabel + '</span>' +
      '<button type="button" class="task-delete" data-task-delete="' + escapeHtml(task.id) + '" aria-label="حذف ' + escapeHtml(task.title) + '">×</button></article>';
  }).join("");
}

initProductivity() {
  const form = document.getElementById("task-form");
  const title = document.getElementById("task-title");
  const due = document.getElementById("task-due");
  const priority = document.getElementById("task-priority");
  const list = document.getElementById("task-list");
  const status = document.getElementById("task-status");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = title.value.trim();
    if (!value) { status.textContent = "اكتب عنوان المهمة أولاً."; title.focus(); return; }
    const tasks = readTasks();
    if (tasks.length >= 200) { status.textContent = "وصلت إلى الحد الأقصى وهو 200 مهمة."; return; }
    tasks.unshift({ id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2), title: value, due: due.value, priority: priority.value, completed: false, createdAt: new Date().toISOString() });
    if (!persistTasks(tasks)) { status.textContent = "تعذر حفظ المهمة في مساحة التخزين."; return; }
    title.value = "";
    due.value = "";
    priority.value = "normal";
    status.textContent = "تمت إضافة المهمة وحفظها.";
    renderTasks();
    title.focus();
  });
  list.addEventListener("change", event => {
    const id = event.target.dataset.taskComplete;
    if (!id) return;
    const tasks = readTasks().map(task => task.id === id ? { ...task, completed: event.target.checked } : task);
    if (!persistTasks(tasks)) status.textContent = "تعذر حفظ حالة المهمة.";
    renderTasks();
  });
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-task-delete]");
    if (!button) return;
    const tasks = readTasks().filter(task => task.id !== button.dataset.taskDelete);
    if (!persistTasks(tasks)) { status.textContent = "تعذر حذف المهمة."; return; }
    status.textContent = "تم حذف المهمة.";
    renderTasks();
  });
  document.querySelectorAll("[data-task-filter]").forEach(button => button.addEventListener("click", () => {
    taskFilter = button.dataset.taskFilter;
    document.querySelectorAll("[data-task-filter]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderTasks();
  }));

  const notes = document.getElementById("quick-notes");
  const notesCount = document.getElementById("notes-count");
  const notesStatus = document.getElementById("notes-status");
  try { notes.value = localStorage.getItem(NOTES_KEY) || ""; } catch { notesStatus.textContent = "التخزين غير متاح"; }
  const updateNotesCount = () => { notesCount.textContent = notes.value.length + " / 5000"; };
  updateNotesCount();
  notes.addEventListener("input", () => {
    updateNotesCount();
    try {
      localStorage.setItem(NOTES_KEY, notes.value);
      notesStatus.textContent = "تم الحفظ";
    } catch { notesStatus.textContent = "تعذر الحفظ"; }
  });

  const start = document.getElementById("focus-start");
  const reset = document.getElementById("focus-reset");
  const renderFocus = () => {
    const minutes = Math.floor(focusRemaining / 60);
    const seconds = focusRemaining % 60;
    document.getElementById("focus-time").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    document.getElementById("focus-progress").style.width = ((FOCUS_DURATION - focusRemaining) / FOCUS_DURATION * 100) + "%";
  };
  start.addEventListener("click", () => {
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
      start.textContent = "استئناف";
      document.getElementById("focus-status").textContent = "تم إيقاف الجلسة مؤقتاً.";
      return;
    }
    if (focusRemaining <= 0) focusRemaining = FOCUS_DURATION;
    start.textContent = "إيقاف مؤقت";
    document.getElementById("focus-status").textContent = "أنت في جلسة تركيز. استمر!";
    focusInterval = setInterval(() => {
      focusRemaining = Math.max(0, focusRemaining - 1);
      renderFocus();
      if (focusRemaining === 0) {
        clearInterval(focusInterval);
        focusInterval = null;
        start.textContent = "ابدأ من جديد";
        document.getElementById("focus-status").textContent = "انتهت جلسة التركيز. أحسنت!";
      }
    }, 1000);
  });
  reset.addEventListener("click", () => {
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = null;
    focusRemaining = FOCUS_DURATION;
    start.textContent = "ابدأ التركيز";
    document.getElementById("focus-status").textContent = "تمت إعادة ضبط المؤقت.";
    renderFocus();
  });
  renderTasks();
  renderFocus();
}
}

const productivityManager = new ProductivityManager();
const readTasks = (...args) => productivityManager.readTasks(...args);
const persistTasks = (...args) => productivityManager.persistTasks(...args);
const renderTasks = (...args) => productivityManager.renderTasks(...args);
const initProductivity = (...args) => productivityManager.initProductivity(...args);