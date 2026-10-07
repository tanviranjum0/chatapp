import { Component } from "react";
import { isStaleBuildError, reportError } from "../lib/reportError";

const RELOAD_KEY = "chatapp-stale-reload";

// wipes everything this app stored on the device (settings, caches) - the fix for a corrupted state
const resetAndReload = async () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* best effort */
  }
  window.location.reload();
};

// last line of defence: a bug in one component shows a friendly screen instead of a blank page
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info?.componentStack);
    reportError(error, { componentStack: info?.componentStack?.slice(0, 800) });

    // the page came from an older deploy and a file it wants is gone: one automatic reload fixes it
    if (isStaleBuildError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">😵</div>
        <h1 className="text-xl font-bold text-white">Something broke on this screen</h1>
        <p className="max-w-sm text-sm text-slate-400">
          Your messages are safe. Reloading usually fixes it - if it keeps happening, try "Reset app data" below.
        </p>
        <p className="max-w-sm break-words rounded-lg bg-white/[0.06] px-3 py-2 font-mono text-xs text-slate-400">
          {String(error?.message || error).slice(0, 160)}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="auth-btn !w-auto px-6">
            Reload
          </button>
          <button
            onClick={resetAndReload}
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Reset app data
          </button>
        </div>
      </div>
    );
  }
}
export default ErrorBoundary;
