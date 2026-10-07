import { API_URL } from "./axios";

// Sends a crash to the server log (so it can be diagnosed) - best effort, never throws, max 5 per page load.
let sent = 0;
const seen = new Set();

const buildId = () => document.querySelector('script[type="module"][src*="index-"]')?.getAttribute("src")?.split("/").pop() || "dev";

export const reportError = (error, extra = {}) => {
  try {
    if (sent >= 5) return;
    const message = String(error?.message || error || "unknown").slice(0, 300);
    if (seen.has(message)) return;
    seen.add(message);
    sent += 1;
    const body = JSON.stringify({
      message,
      name: error?.name,
      stack: error?.stack,
      url: window.location.pathname,
      build: buildId(),
      ...extra,
    });
    // sendBeacon survives a page that is about to reload
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.(`${API_URL}/client-errors`, blob)) {
      fetch(`${API_URL}/client-errors`, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* reporting must never cause another error */
  }
};

// a lazily loaded file that no longer exists on the server: the page is from an older deploy
export const isStaleBuildError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(
    `${error?.name || ""} ${error?.message || ""}`,
  );

export const installGlobalErrorReporting = () => {
  window.addEventListener("error", (e) => reportError(e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason));
};
