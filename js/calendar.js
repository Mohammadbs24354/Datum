const countryNames = { DE: "ألمانيا", EG: "مصر", GB: "المملكة المتحدة", US: "الولايات المتحدة", FR: "فرنسا", AE: "الإمارات", SA: "السعودية", TR: "تركيا", JP: "اليابان", CA: "كندا" };

class CalendarService {
async loadHolidays() {
  const requestId = ++holidayRequestId;
  const country = document.getElementById("holiday-country").value;
  const year = document.getElementById("holiday-year").value;
  const list = document.getElementById("holiday-list");
  const status = document.getElementById("holiday-status");
  list.innerHTML = '<p class="muted">جارٍ تحميل العطلات الرسمية…</p>';
  status.textContent = "";
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${encodeURIComponent(year)}/${encodeURIComponent(country)}`);
    if (!response.ok) throw new Error("لم تتوفر بيانات العطلات لهذه الدولة والسنة.");
    const holidays = await response.json();
    if (requestId !== holidayRequestId) return;
    if (!Array.isArray(holidays) || holidays.length === 0) {
      list.innerHTML = '<p class="muted">لا توجد عطلات مسجلة في هذه الفترة.</p>';
      status.textContent = "لا توجد نتائج.";
      return;
    }
    list.innerHTML = holidays.map(holiday => {
      const date = new Date(holiday.date + "T12:00:00");
      const formatted = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(date);
      const localName = String(holiday.localName || holiday.name || "عطلة رسمية").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      const englishName = String(holiday.name || "").replace(/[&<>"]/g, "");
      const types = Array.isArray(holiday.types) ? holiday.types.map(escapeHtml).join(" · ") : "";
      return `<article class="holiday-item"><div class="holiday-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ar", { month: "short" }).format(date)}</span></div><div class="holiday-description"><b>${localName}</b><span>${englishName}</span></div><small>${formatted} · ${types}</small></article>`;
    }).join("");
    status.textContent = `تم العثور على ${holidays.length} مناسبة رسمية في ${countryNames[country]} لعام ${year}.`;
  } catch (error) {
    if (requestId !== holidayRequestId) return;
    list.innerHTML = '<p class="muted">تعذر تحميل بيانات العطلات حالياً.</p>';
    status.textContent = error.message || "حدث خطأ أثناء تحميل التقويم.";
  }
}

initDateTools() {
  const today = new Date();
  const holidayYearSelect = document.getElementById("holiday-year");
  holidayYearSelect.innerHTML = [0, 1, 2].map(offset => {
    const year = today.getFullYear() + offset;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById("date-picker").value = localToday;
  document.getElementById("date-start").value = localToday;
  document.getElementById("date-end").value = localToday;
  document.getElementById("date-picker").addEventListener("change", event => {
    if (!event.target.value) return;
    const date = new Date(event.target.value + "T12:00:00");
    document.getElementById("date-result").textContent = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  });
  const calculateDays = () => {
    const start = document.getElementById("date-start").value;
    const end = document.getElementById("date-end").value;
    if (!start || !end) return;
    const difference = Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000);
    document.getElementById("days-result").textContent = difference >= 0 ? `الفارق: ${difference} يوم` : `تاريخ النهاية يسبق البداية بـ ${Math.abs(difference)} يوم`;
  };
  document.getElementById("date-start").addEventListener("change", calculateDays);
  document.getElementById("date-end").addEventListener("change", calculateDays);
  document.getElementById("date-picker").dispatchEvent(new Event("change"));
  calculateDays();
}
}

const calendarService = new CalendarService();
const loadHolidays = (...args) => calendarService.loadHolidays(...args);
const initDateTools = (...args) => calendarService.initDateTools(...args);