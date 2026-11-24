class PwaManager {
initPwa() {
  const installButton = document.getElementById("install-app");
  const syncStatus = document.getElementById("sync-status");
  let installPrompt = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // The dashboard remains fully usable when service workers are unavailable.
      });
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") syncStatus.textContent = "تم إرسال طلب تثبيت Datum.";
    installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    syncStatus.textContent = "تم تثبيت Datum على جهازك.";
  });
  window.addEventListener("offline", () => {
    syncStatus.textContent = "أنت غير متصل · النسخة المحفوظة متاحة";
  });
  window.addEventListener("online", () => {
    syncStatus.textContent = "عاد الاتصال بالإنترنت";
  });
}
}

const pwaManager = new PwaManager();
const initPwa = (...args) => pwaManager.initPwa(...args);