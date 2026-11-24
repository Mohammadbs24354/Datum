const LAYOUT_KEY = "datum-dashboard-layout-v1";

class DashboardCustomizer {
readLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}
applyLayout(layout) {
  document.querySelectorAll("[data-section-toggle]").forEach(input => {
    const sectionId = input.dataset.sectionToggle;
    const visible = layout[sectionId] !== false;
    input.checked = visible;
    const section = document.getElementById(sectionId);
    if (section) section.hidden = !visible;
    const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (navLink) navLink.hidden = !visible;
  });
}
initCustomizer() {
  const dialog = document.getElementById("customizer-dialog");
  const status = document.getElementById("customizer-status");
  const initial = readLayout();
  applyLayout(initial);
  document.getElementById("open-customizer").addEventListener("click", () => {
    applyLayout(readLayout());
    if (typeof dialog.showModal === "function") dialog.showModal();
    else status.textContent = "متصفحك لا يدعم نافذة التخصيص.";
  });
  document.getElementById("save-layout").addEventListener("click", event => {
    event.preventDefault();
    const layout = {};
    document.querySelectorAll("[data-section-toggle]").forEach(input => {
      layout[input.dataset.sectionToggle] = input.checked;
    });
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      applyLayout(layout);
      status.textContent = "تم حفظ إعدادات لوحة التحكم.";
      dialog.close();
    } catch {
      status.textContent = "تعذر حفظ التفضيلات في هذا المتصفح.";
    }
  });
  document.getElementById("reset-layout").addEventListener("click", () => {
    const defaults = {};
    document.querySelectorAll("[data-section-toggle]").forEach(input => {
      defaults[input.dataset.sectionToggle] = true;
    });
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(defaults));
      applyLayout(defaults);
      status.textContent = "تمت استعادة جميع الأقسام.";
    } catch {
      status.textContent = "تعذر تحديث الإعدادات.";
    }
  });
}
}

const dashboardCustomizer = new DashboardCustomizer();
const readLayout = (...args) => dashboardCustomizer.readLayout(...args);
const applyLayout = (...args) => dashboardCustomizer.applyLayout(...args);
const initCustomizer = (...args) => dashboardCustomizer.initCustomizer(...args);