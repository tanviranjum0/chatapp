import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FileIcon, ImageIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { dayLabel, timeLabel } from "../lib/chatUtils.js";

// highlights the matched part of a result without using innerHTML
function Highlight({ text, query }) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-brand-500/40 px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function SearchPanel() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const setSearchOpen = useChatStore((s) => s.setSearchOpen);
  const jumpToMessage = useChatStore((s) => s.jumpToMessage);
  const authUser = useAuthStore((s) => s.authUser);

  const [query, setQuery] = useState("");
  const [filesOnly, setFilesOnly] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const q = query.trim();
    if (!q && !filesOnly) {
      setResults([]);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(`/messages/search/${selectedUser._id}`, {
          params: { q, type: filesOnly ? "files" : "all" },
          signal: controller.signal,
        });
        setResults(res.data);
      } catch (e) {
        if (e.code !== "ERR_CANCELED") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, filesOnly, selectedUser._id]);

  // Escape closes the panel, not the whole conversation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [setSearchOpen]);

  const q = query.trim();

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="glass-strong absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-white/10 shadow-soft sm:w-96"
      role="search"
      aria-label="Search in conversation"
    >
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${selectedUser.fullName}…`}
            aria-label="Search messages"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500/70"
          />
        </div>
        <button
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/10 px-3 py-2">
        {[
          ["Messages", false],
          ["Files & photos", true],
        ].map(([label, val]) => (
          <button
            key={label}
            onClick={() => setFilesOnly(val)}
            aria-pressed={filesOnly === val}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filesOnly === val
                ? "bg-brand-500/25 text-white"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="flex justify-center p-4 text-slate-400">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        )}
        {!loading && results.length === 0 && (q || filesOnly) && (
          <p className="p-6 text-center text-sm text-slate-500">Nothing found</p>
        )}
        {!q && !filesOnly && (
          <p className="p-6 text-center text-sm text-slate-500">
            Type to search every message and file name in this chat.
          </p>
        )}
        <ul className="space-y-1">
          {results.map((m) => (
            <li key={m._id}>
              <button
                onClick={() => jumpToMessage(m._id)}
                className="w-full rounded-xl p-3 text-left transition-colors hover:bg-white/[0.07]"
              >
                <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-300">
                    {m.senderId === authUser?._id ? "You" : selectedUser.fullName}
                  </span>
                  <span>
                    {dayLabel(m.createdAt)} · {timeLabel(m.createdAt)}
                  </span>
                </div>
                {m.file ? (
                  <p className="flex items-center gap-2 text-sm text-slate-200">
                    <FileIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      <Highlight text={m.file.name} query={q} />
                    </span>
                  </p>
                ) : m.image && !m.text ? (
                  <p className="flex items-center gap-2 text-sm text-slate-200">
                    <ImageIcon className="size-4 shrink-0" /> Photo
                  </p>
                ) : (
                  <p className="line-clamp-2 break-words text-sm text-slate-200">
                    <Highlight text={m.text || ""} query={q} />
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
export default SearchPanel;
