import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BotIcon, CopyIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import Modal from "./Modal";
import { axiosInstance } from "../lib/axios";
import { getErrorMessage } from "../lib/errors";
import { useChatStore } from "../store/useChatStore";

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500/70";

const errText = (e) => getErrorMessage(e);

function BotCard({ bot, onChange, onDelete }) {
  const [url, setUrl] = useState(bot.webhookUrl || "");
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      const res = await axiosInstance.patch(`/bots/${bot._id}`, patch);
      onChange(res.data);
      toast.success("Saved");
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const curl = `curl -X POST ${bot.incomingUrl} -H "Content-Type: application/json" -d '{"text":"Hello from a script"}'`;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold text-white">
          <BotIcon className="size-5 text-brand-400" /> {bot.fullName}
        </p>
        <button
          onClick={() => window.confirm(`Delete ${bot.fullName} and its messages?`) && onDelete(bot)}
          aria-label={`Delete ${bot.fullName}`}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-400">
          Incoming webhook (POST JSON <code>{"{ text }"}</code> and the bot messages you)
        </label>
        <div className="flex gap-2">
          <input readOnly value={bot.incomingUrl} className={`${field} font-mono text-xs`} aria-label="Incoming webhook URL" />
          <button onClick={() => copy(bot.incomingUrl)} aria-label="Copy URL" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:bg-white/10">
            <CopyIcon className="size-4" />
          </button>
          <button
            onClick={() => window.confirm("Rotate the URL? The old one stops working.") && save({ rotateToken: true })}
            aria-label="Rotate URL"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:bg-white/10"
          >
            <RefreshCwIcon className="size-4" />
          </button>
        </div>
        <button onClick={() => copy(curl)} className="mt-1 text-xs text-brand-400 underline">
          Copy example curl command
        </button>
      </div>

      <div>
        <label htmlFor={`wh-${bot._id}`} className="mb-1 block text-xs font-semibold text-slate-400">
          Outgoing webhook (we POST your messages here; reply with <code>{'{"text":"..."}'}</code>)
        </label>
        <div className="flex gap-2">
          <input
            id={`wh-${bot._id}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/my-bot (optional)"
            className={field}
          />
          <button
            onClick={() => save({ webhookUrl: url })}
            disabled={saving || url === (bot.webhookUrl || "")}
            className="shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-snow disabled:opacity-40"
          >
            Save
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Requests are signed: <code>X-Chatapp-Signature: sha256=HMAC(body, incoming token)</code>. Only public https URLs are allowed.
        </p>
      </div>
    </div>
  );
}

function BotsModal({ open, onClose }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBots((await axiosInstance.get("/bots")).data);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await axiosInstance.post("/bots", { name });
      setBots((b) => [...b, res.data]);
      setName("");
      // the bot greets you over the socket, which adds it to the chats list by itself
      toast.success("Bot created - find it in your chats");
    } catch (e2) {
      toast.error(errText(e2));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (bot) => {
    try {
      await axiosInstance.delete(`/bots/${bot._id}`);
      setBots((b) => b.filter((x) => x._id !== bot._id));
      const { selectedUser, setSelectedUser } = useChatStore.getState();
      if (selectedUser?._id === bot._id) setSelectedUser(null);
      useChatStore.getState().fetchChats({ silent: true });
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Bots & integrations" wide>
      <p className="mb-4 text-sm text-slate-400">
        Create a bot to receive alerts from scripts, CI or any service via a webhook, or connect your own
        server so the bot can answer when you message it.
      </p>

      <form onSubmit={create} className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="New bot name, e.g. Deploy Alerts"
          aria-label="New bot name"
          className={field}
        />
        <button
          disabled={creating || !name.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-bloom-500 px-4 text-sm font-semibold text-snow disabled:opacity-40"
        >
          <PlusIcon className="size-4" /> Create
        </button>
      </form>

      <div className="space-y-3">
        {loading && <p className="text-center text-sm text-slate-500">Loading…</p>}
        {!loading && bots.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
            No bots yet.
          </p>
        )}
        {bots.map((b) => (
          <BotCard
            key={b._id}
            bot={b}
            onChange={(nb) => setBots((list) => list.map((x) => (x._id === nb._id ? nb : x)))}
            onDelete={remove}
          />
        ))}
      </div>
    </Modal>
  );
}
export default BotsModal;
