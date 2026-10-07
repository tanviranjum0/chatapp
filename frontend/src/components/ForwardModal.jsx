import { useEffect, useMemo, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";

const MAX_RECIPIENTS = 5;

// recent chats are listed straight away; typing searches everyone by name or email
function ForwardModal() {
  const forwardingMessage = useChatStore((s) => s.forwardingMessage);
  const setForwardingMessage = useChatStore((s) => s.setForwardingMessage);
  const chats = useChatStore((s) => s.chats);
  const forwardMessage = useChatStore((s) => s.forwardMessage);

  const [picked, setPicked] = useState([]); // [{ _id, fullName, profilePic }]
  const [filter, setFilter] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (forwardingMessage) {
      setPicked([]);
      setFilter("");
      setFound([]);
    }
  }, [forwardingMessage]);

  useEffect(() => {
    const q = filter.trim();
    if (q.length < 2) {
      setFound([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/messages/contacts", { params: { q } });
        setFound(res.data.filter((u) => !u.isBot));
      } catch {
        setFound([]);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [filter]);

  const people = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const recents = chats.filter((c) => !c.isBot && (!q || c.fullName.toLowerCase().includes(q)));
    const extra = found.filter((u) => !recents.some((r) => r._id === u._id));
    return [...recents, ...extra];
  }, [chats, found, filter]);

  const toggle = (user) =>
    setPicked((p) =>
      p.some((x) => x._id === user._id)
        ? p.filter((x) => x._id !== user._id)
        : p.length < MAX_RECIPIENTS
          ? [...p, user]
          : p,
    );

  const submit = async () => {
    setBusy(true);
    await forwardMessage(
      forwardingMessage._id,
      picked.map((u) => u._id),
    );
    setBusy(false);
  };

  const preview =
    forwardingMessage?.text || (forwardingMessage?.image ? "📷 Photo" : forwardingMessage?.file?.name);

  return (
    <Modal open={Boolean(forwardingMessage)} onClose={() => setForwardingMessage(null)} title="Forward message">
      <p className="mb-4 line-clamp-2 break-words rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-slate-300">
        {preview}
      </p>
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search recent chats, names or emails"
          aria-label="Search people"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500/70"
        />
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {people.map((u) => {
          const on = picked.some((x) => x._id === u._id);
          return (
            <li key={u._id}>
              <button
                onClick={() => toggle(u)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                  on ? "border-brand-500/60 bg-brand-500/15" : "border-transparent hover:bg-white/[0.07]"
                }`}
              >
                <Avatar src={u.profilePic} alt="" size="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-100">{u.fullName}</span>
                  {u.emailHint && <span className="block truncate text-xs text-slate-500">{u.emailHint}</span>}
                </span>
                {on && <CheckIcon className="size-5 text-brand-400" />}
              </button>
            </li>
          );
        })}
        {people.length === 0 && (
          <li className="p-4 text-center text-sm text-slate-500">
            {filter.trim().length < 2 ? "No recent chats yet - search for someone." : "No one found"}
          </li>
        )}
      </ul>
      <button onClick={submit} disabled={!picked.length || busy} className="auth-btn mt-4">
        {busy ? "Sending…" : `Forward${picked.length ? ` to ${picked.length}` : ""}`}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Up to {MAX_RECIPIENTS} people at once</p>
    </Modal>
  );
}
export default ForwardModal;
