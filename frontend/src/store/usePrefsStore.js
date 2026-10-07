import { create } from "zustand";

const KEY = "chatapp-prefs-v1";

const DEFAULTS = {
  theme: "dark", // dark | light | system
  fontScale: 1, // 0.9 - 1.4
  highContrast: false,
  reduceMotion: false,
  translateLang: "", // "" = translation off, otherwise a language code
  autoTranslate: false,
  smartReplies: true,
};

const load = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
};

const systemPrefersLight = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;

// writes the preferences onto <html> so the css tokens in theme.css take over
const apply = (p) => {
  const root = document.documentElement;
  const theme = p.theme === "system" ? (systemPrefersLight() ? "light" : "dark") : p.theme;
  root.dataset.theme = theme;
  root.dataset.contrast = p.highContrast ? "high" : "normal";
  root.dataset.motion = p.reduceMotion ? "reduce" : "normal";
  root.style.setProperty("--font-scale", String(p.fontScale));
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#eef2ff" : "#06060f");
};

const initial = load();
apply(initial);

export const usePrefsStore = create((set, get) => ({
  ...initial,
  setPref: (patch) => {
    const next = { ...get(), ...patch };
    const { theme, fontScale, highContrast, reduceMotion, translateLang, autoTranslate, smartReplies } =
      next;
    const saved = { theme, fontScale, highContrast, reduceMotion, translateLang, autoTranslate, smartReplies };
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* private mode: preferences just won't persist */
    }
    apply(saved);
    set(patch);
  },
  reset: () => get().setPref({ ...DEFAULTS }),
}));

// follow the OS when the user picked "system"
if (typeof window !== "undefined") {
  window.matchMedia?.("(prefers-color-scheme: light)").addEventListener("change", () => {
    const s = usePrefsStore.getState();
    if (s.theme === "system") apply(s);
  });
}
