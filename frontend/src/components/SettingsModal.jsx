import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import Modal from "./Modal";
import { usePrefsStore } from "../store/usePrefsStore";
import { LANGUAGES } from "../lib/chatUtils.js";

const THEMES = [
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "light", label: "Light", icon: SunIcon },
  { id: "system", label: "System", icon: MonitorIcon },
];

const SIZES = [
  { v: 0.9, label: "Small" },
  { v: 1, label: "Default" },
  { v: 1.15, label: "Large" },
  { v: 1.3, label: "Extra large" },
];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-medium text-slate-100">{label}</span>
        {hint && <span className="block text-sm text-slate-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-snow shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-white/10 pb-4 last:border-0">
      <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function SettingsModal({ open, onClose }) {
  const prefs = usePrefsStore();
  const { setPref } = prefs;

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="-mt-4">
        <Section title="Appearance">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ id, label, icon }) => {
              const Icon = icon;
              const on = prefs.theme === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPref({ theme: id })}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition-colors ${
                    on
                      ? "border-brand-500/70 bg-brand-500/15 text-white"
                      : "border-white/10 text-slate-300 hover:bg-white/[0.07]"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Accessibility">
          <p className="mb-2 font-medium text-slate-100">Text size</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Text size">
            {SIZES.map(({ v, label }) => (
              <button
                key={v}
                role="radio"
                aria-checked={prefs.fontScale === v}
                onClick={() => setPref({ fontScale: v })}
                className={`rounded-xl border px-1 py-2 text-xs font-medium transition-colors ${
                  prefs.fontScale === v
                    ? "border-brand-500/70 bg-brand-500/15 text-white"
                    : "border-white/10 text-slate-300 hover:bg-white/[0.07]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Toggle
            label="High contrast"
            hint="Stronger text and borders"
            checked={prefs.highContrast}
            onChange={(v) => setPref({ highContrast: v })}
          />
          <Toggle
            label="Reduce motion"
            hint="Turns off animations"
            checked={prefs.reduceMotion}
            onChange={(v) => setPref({ reduceMotion: v })}
          />
        </Section>

        <Section title="Smart features">
          <Toggle
            label="Smart replies"
            hint="Suggests quick replies to the last message"
            checked={prefs.smartReplies}
            onChange={(v) => setPref({ smartReplies: v })}
          />
          <div className="py-3">
            <label htmlFor="lang" className="mb-1.5 block font-medium text-slate-100">
              Translate messages into
            </label>
            <select
              id="lang"
              value={prefs.translateLang}
              onChange={(e) =>
                setPref({
                  translateLang: e.target.value,
                  autoTranslate: e.target.value ? prefs.autoTranslate : false,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-slate-100 outline-none focus:border-brand-500/70"
            >
              <option value="">Off (use the translate button per message)</option>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <Toggle
            label="Live translation"
            hint="Automatically translate incoming messages"
            checked={prefs.autoTranslate && Boolean(prefs.translateLang)}
            onChange={(v) => setPref({ autoTranslate: v && Boolean(prefs.translateLang) })}
          />
          {prefs.autoTranslate && !prefs.translateLang && (
            <p className="text-sm text-amber-400">Pick a language first.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Smart replies and translations send the relevant message text to an AI/translation
            service. Turn them off if you prefer messages to stay on this app only.
          </p>
        </Section>

        <button
          onClick={prefs.reset}
          className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.07]"
        >
          Reset to defaults
        </button>
      </div>
    </Modal>
  );
}
export default SettingsModal;
