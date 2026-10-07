import { useEffect, useMemo, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { useChatStore } from "../store/useChatStore";

const MAX_RECIPIENTS = 5;

function ForwardModal() {
  const forwardingMessage = useChatStore((s) => s.forwardingMessage);
  const setForwardingMessage = useChatStore((s) => s.setForwardingMessage);
  const allContacts = useChatStore((s) => s.allContacts);
  const chats = useChatStore((s) => s.chats);
  const getAllContacts = useChatStore((s) => s.getAllContacts);
  const forwardMessage = useChatStore((s) => s.forwardMessage);

  const [picked, setPicked] = useState([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (forwardingMessage) {
      setPicked([]);
      setFilter("");
      if (!allContacts.length) getAllContacts();
    }
  }, [forwardingMessage, allContacts.length, getAllContacts]);

  // people you already chat with first, bots can't receive forwards
  const people = useMemo(() => {
    const recent = new Set(chats.map((c) => c._id));
    return allContacts
      .filter((u) => !u.isBot && u.fullName.toLowerCase().includes(filter.trim().toLowerCase()))
      .sort((a, b) => Number(recent.has(b._id)) - Number(recent.has(a._id)));
  }, [allContacts, chats, filter]);

  const toggle = (id) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_RECIPIENTS ? [...p, id] : p,
    );

  const submit = async () => {
    setBusy(true);
    await forwardMessage(forwardingMessage._id, picked);
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
          placeholder="Search people"
          aria-label="Search people"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500/70"
        />
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {people.map((u) => {
          const on = picked.includes(u._id);
          return (
            <li key={u._id}>
              <button
                onClick={() => toggle(u._id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                  on ? "border-brand-500/60 bg-brand-500/15" : "border-transparent hover:bg-white/[0.07]"
                }`}
              >
                <Avatar src={u.profilePic} alt={u.fullName} size="size-10" />
                <span className="flex-1 truncate font-medium text-slate-100">{u.fullName}</span>
                {on && <CheckIcon className="size-5 text-brand-400" />}
              </button>
            </li>
          );
        })}
        {people.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No one found</li>}
      </ul>
      <button
        onClick={submit}
        disabled={!picked.length || busy}
        className="auth-btn mt-4"
      >
        {busy ? "Sending…" : `Forward${picked.length ? ` to ${picked.length}` : ""}`}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Up to {MAX_RECIPIENTS} people at once</p>
    </Modal>
  );
}
export default ForwardModal;
