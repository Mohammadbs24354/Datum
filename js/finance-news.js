const currencyNames = { EUR: "اليورو", USD: "الدولار الأمريكي", GBP: "الجنيه الإسترليني", AED: "الدرهم الإماراتي", EGP: "الجنيه المصري", SAR: "الريال السعودي", TRY: "الليرة التركية", CHF: "الفرنك السويسري", JPY: "الين الياباني", CAD: "الدولار الكندي" };
let currencyRequestId = 0;
let newsRequestId = 0;

class FinanceNewsService {
async convertCurrency() {
  const requestId = ++currencyRequestId;
  const amount = Number(document.getElementById("amount-input").value);
  const from = document.getElementById("from-currency").value;
  const to = document.getElementById("to-currency").value;
  const status = document.getElementById("currency-status");
  if (!Number.isFinite(amount) || amount < 0) {
    status.textContent = "أدخل مبلغاً صحيحاً أكبر من أو يساوي صفراً.";
    return;
  }
  if (from === to) {
    document.getElementById("conversion-value").textContent = new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(amount) + " " + to;
    document.getElementById("conversion-rate").textContent = "1 " + from + " = 1 " + to;
    document.getElementById("rate-date").textContent = "لا يلزم تحويل";
    status.textContent = "";
    return;
  }
  status.textContent = "جارٍ تحديث سعر الصرف…";
  try {
    const url = new URL("https://api.frankfurter.app/latest");
    url.search = new URLSearchParams({ amount: String(amount), from, to }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("خدمة أسعار الصرف غير متاحة حالياً.");
    const data = await response.json();
    if (requestId !== currencyRequestId) return;
    const converted = data.rates?.[to];
    if (typeof converted !== "number") throw new Error("لا يتوفر سعر لهذه العملة.");
    document.getElementById("conversion-value").textContent = new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(converted) + " " + to;
    document.getElementById("conversion-rate").textContent = `1 ${from} (${currencyNames[from]}) = ${new Intl.NumberFormat("en", { maximumFractionDigits: 5 }).format(converted / (amount || 1))} ${to}`;
    document.getElementById("rate-date").textContent = data.date || "—";
    status.textContent = "السعر المرجعي بتاريخ " + (data.date || "غير محدد") + ".";
  } catch (error) {
    if (requestId === currencyRequestId) status.textContent = error.message || "تعذر تحويل العملة.";
  }
}

async loadWorldNews() {
  const requestId = ++newsRequestId;
  const query = document.getElementById("news-query").value.trim() || "world";
  const list = document.getElementById("news-list");
  const status = document.getElementById("news-status");
  list.innerHTML = '<article class="news-placeholder">جارٍ البحث عن أحدث الأخبار…</article>';
  status.textContent = "يتم جلب العناوين من GDELT.";
  try {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.search = new URLSearchParams({
      query: query + " sourcelang:english",
      mode: "ArtList",
      format: "json",
      maxrecords: "10",
      sort: "DateDesc"
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر الاتصال بخدمة الأخبار.");
    const data = await response.json();
    if (requestId !== newsRequestId) return;
    const articles = (data.articles || []).filter(article => article.title && article.url).slice(0, 10);
    if (!articles.length) {
      list.innerHTML = '<article class="news-placeholder">لم نعثر على نتائج. جرّب موضوعاً أو دولة أخرى.</article>';
      status.textContent = "لا توجد عناوين مطابقة لهذا البحث.";
      return;
    }
    list.innerHTML = articles.map(article => {
      const title = String(article.title).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      const domain = String(article.domain || "مصدر إخباري").replace(/[&<>"]/g, "");
      const date = article.seendate ? article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3 $4:$5") : "";
      const safeDate = date.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      let safeUrl;
      try {
        safeUrl = new URL(article.url);
        if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") return "";
      } catch { return ""; }
      return `<article class="news-card"><h3>${title}</h3><div class="news-meta"><span>${domain} · ${safeDate}</span><a href="${safeUrl.href}" target="_blank" rel="noopener noreferrer">قراءة الخبر ↗</a></div></article>`;
    }).join("");
    status.textContent = `تم العثور على ${articles.length} عناوين. الأخبار وروابطها من مصادر خارجية.`;
  } catch (error) {
    if (requestId !== newsRequestId) return;
    list.innerHTML = '<article class="news-placeholder">تعذر تحميل الأخبار الآن. يمكنك المحاولة مرة أخرى لاحقاً.</article>';
    status.textContent = error.message || "حدث خطأ أثناء تحميل الأخبار.";
  }
}
}

const financeNewsService = new FinanceNewsService();
const convertCurrency = (...args) => financeNewsService.convertCurrency(...args);
const loadWorldNews = (...args) => financeNewsService.loadWorldNews(...args);