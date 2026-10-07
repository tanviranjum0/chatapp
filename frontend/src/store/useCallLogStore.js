import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { getErrorMessage } from "../lib/errors";

const INITIAL = { logs: [], loaded: false, loading: false, loadingMore: false, hasMore: false, missedUnseen: 0 };

// newest first
const byStart = (a, b) => new Date(b.startedAt) - new Date(a.startedAt);

export const useCallLogStore = create((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL }),

  // `silent`: refresh in the background (no skeleton) - used when the tab is reopened or after a reconnect
  fetchLogs: async ({ silent = false } = {}) => {
    if (!silent && !get().loaded) set({ loading: true });
    try {
      const res = await axiosInstance.get("/calls/history", { params: { limit: 40 } });
      set({
        logs: res.data.logs,
        hasMore: res.data.hasMore,
        missedUnseen: res.data.missedUnseen,
        loaded: true,
      });
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, "We couldn't load your call history."));
    } finally {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { logs, loadingMore, hasMore } = get();
    if (loadingMore || !hasMore || !logs.length) return;
    set({ loadingMore: true });
    try {
      const res = await axiosInstance.get("/calls/history", {
        params: { limit: 40, before: logs[logs.length - 1].startedAt },
      });
      const known = new Set(logs.map((l) => l._id));
      set({ logs: [...logs, ...res.data.logs.filter((l) => !known.has(l._id))], hasMore: res.data.hasMore });
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't load older calls."));
    } finally {
      set({ loadingMore: false });
    }
  },

  // the server pushed a new or changed call (ring, answer, hang up...)
  handleLog: (log) => {
    const { logs, missedUnseen } = get();
    const exists = logs.some((l) => l._id === log._id);
    const next = exists ? logs.map((l) => (l._id === log._id ? log : l)) : [log, ...logs].sort(byStart);
    // a call that just turned into a missed one counts once
    const wasMissed = logs.find((l) => l._id === log._id)?.outcome === "missed";
    const nowMissed = log.direction === "incoming" && log.outcome === "missed";
    set({ logs: next, missedUnseen: nowMissed && !wasMissed ? missedUnseen + 1 : missedUnseen });
  },

  // the Calls tab is on screen: everything missed so far has been seen
  markSeen: async () => {
    if (!get().missedUnseen) return;
    set({ missedUnseen: 0 });
    try {
      await axiosInstance.post("/calls/history/seen");
    } catch {
      /* the next open retries */
    }
  },

  remove: async (id) => {
    const before = get().logs;
    set({ logs: before.filter((l) => l._id !== id) });
    try {
      await axiosInstance.delete(`/calls/history/${id}`);
    } catch (error) {
      set({ logs: before });
      toast.error(getErrorMessage(error, "We couldn't delete that entry."));
    }
  },

  clearAll: async () => {
    const before = get().logs;
    set({ logs: [], hasMore: false });
    try {
      await axiosInstance.delete("/calls/history");
      toast.success("Call history cleared");
    } catch (error) {
      set({ logs: before });
      toast.error(getErrorMessage(error, "We couldn't clear your history."));
    }
  },

  bindSocket: (socket) => {
    const onLog = (log) => get().handleLog(log);
    socket.on("callLog", onLog);
    return () => socket.off("callLog", onLog);
  },
}));
