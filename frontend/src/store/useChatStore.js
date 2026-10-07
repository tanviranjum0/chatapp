import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { getErrorMessage } from "../lib/errors";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { usePrefsStore } from "./usePrefsStore";

// swaps one message inside a list (by id), leaving the rest untouched
const replaceIn = (list, msg) => list.map((m) => (m._id === msg._id ? { ...m, ...msg } : m));

// the trimmed copy of a message shown under a name in the chats list
const previewOf = (m) => ({
  _id: m._id,
  senderId: m.senderId,
  createdAt: m.createdAt,
  deleted: Boolean(m.deletedAt),
  text: m.deletedAt ? "" : (m.text || "").slice(0, 80),
  hasImage: !m.deletedAt && Boolean(m.image),
  fileName: !m.deletedAt ? m.file?.name : undefined,
});

const EMPTY_SUGGESTIONS = { forMessageId: null, replies: [] };
let searchSeq = 0; // ignores slow responses for an older query
const loadingSender = new Set(); // ids we are already fetching

const INITIAL = {
  chats: [],
  chatsLoaded: false,
  isUsersLoading: false,
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  messages: [],
  selectedUser: null,
  isMessagesLoading: false,
  replyingTo: null,
  editingMessage: null,
  forwardingMessage: null,
  searchOpen: false,
  lightbox: null,
  jumpTarget: null,
  translations: {},
  suggestions: EMPTY_SUGGESTIONS,
};

export const useChatStore = create((set, get) => ({
  ...INITIAL,
  activeTab: "chats",
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  // back to a blank slate (logout)
  reset: () => set({ ...INITIAL, activeTab: "chats" }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedUser: (selectedUser) => {
    set({
      selectedUser,
      messages: [],
      isMessagesLoading: Boolean(selectedUser), // no empty-state flash while the history loads
      replyingTo: null,
      editingMessage: null,
      forwardingMessage: null,
      searchOpen: false,
      jumpTarget: null,
      suggestions: EMPTY_SUGGESTIONS,
    });
    if (selectedUser) get().markConversationRead(selectedUser._id);
  },

  setReplyingTo: (replyingTo) => set({ replyingTo, editingMessage: null }),
  setEditingMessage: (editingMessage) => set({ editingMessage, replyingTo: null }),
  setForwardingMessage: (forwardingMessage) => set({ forwardingMessage }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  clearJumpTarget: () => set({ jumpTarget: null }),

  // ---------------- chats list ----------------
  // `silent` refreshes in the background: no skeleton, no toast, nothing jumps
  fetchChats: async ({ silent = false } = {}) => {
    if (!silent && !get().chatsLoaded) set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      // keep the counter of the conversation that is open at 0, the server may not have heard yet
      const openId = get().selectedUser?._id;
      set({
        chats: res.data.map((c) => (c._id === openId ? { ...c, unreadCount: 0 } : c)),
        chatsLoaded: true,
      });
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, "We couldn't load your chats."));
    } finally {
      if (get().isUsersLoading) set({ isUsersLoading: false });
    }
  },

  // inserts or updates one chat row and moves it to the top
  upsertChat: (user, patch = {}) => {
    const chats = get().chats;
    const current = chats.find((c) => c._id === user._id);
    const next = { unreadCount: 0, ...current, ...user, ...patch };
    set({ chats: [next, ...chats.filter((c) => c._id !== user._id)] });
  },

  // ---------------- contact search ----------------
  searchContacts: async (query) => {
    const q = query.trim();
    set({ searchQuery: query });
    const seq = ++searchSeq;
    if (q.length < 2) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get("/messages/contacts", { params: { q } });
      if (seq === searchSeq) set({ searchResults: res.data, isSearching: false });
    } catch (error) {
      if (seq !== searchSeq) return;
      set({ searchResults: [], isSearching: false });
      if (error.response?.status !== 429) toast.error(getErrorMessage(error, "Search failed."));
    }
  },
  clearSearch: () => {
    searchSeq += 1;
    set({ searchQuery: "", searchResults: [], isSearching: false });
  },

  // ---------------- conversation ----------------
  getMessagesByUserId: async (userId, { silent = false } = {}) => {
    if (!silent) set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      // ignore a slow response for a conversation the user already left
      if (get().selectedUser?._id === userId) {
        const optimistic = silent ? get().messages.filter((m) => m.isOptimistic) : [];
        set({ messages: [...res.data, ...optimistic] });
      }
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, "We couldn't load this conversation."));
    } finally {
      if (!silent) set({ isMessagesLoading: false });
    }
  },

  // tells the server (and the sender's screen) that this conversation was seen
  markConversationRead: async (userId) => {
    const chat = get().chats.find((c) => c._id === userId);
    if (chat?.unreadCount) {
      set({ chats: get().chats.map((c) => (c._id === userId ? { ...c, unreadCount: 0 } : c)) });
    }
    if (typeof document !== "undefined" && document.hidden) return; // read once the tab is visible again
    try {
      await axiosInstance.post(`/messages/read/${userId}`);
    } catch {
      /* the next open retries; never bother the user */
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, replyingTo } = get();
    const { authUser } = useAuthStore.getState();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      file: messageData.file
        ? { name: messageData.file.name, size: messageData.file.size, mimeType: messageData.file.type }
        : undefined,
      replyTo: replyingTo?._id,
      replyPreview: replyingTo
        ? {
            _id: replyingTo._id,
            senderId: replyingTo.senderId,
            text: (replyingTo.text || "").slice(0, 140),
            hasImage: Boolean(replyingTo.image),
            fileName: replyingTo.file?.name,
          }
        : undefined,
      reactions: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    set({ messages: [...get().messages, optimisticMessage], replyingTo: null });
    get().upsertChat(selectedUser, { lastMessage: previewOf(optimisticMessage) });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
        text: messageData.text,
        image: messageData.image,
        file: messageData.file ? { name: messageData.file.name, data: messageData.file.data } : undefined,
        replyTo: replyingTo?._id,
      });
      const current = get().messages;
      // the socket echo may have delivered the saved copy before this response arrived
      const already = current.some((m) => m._id === res.data._id);
      set({
        messages: already
          ? current.filter((m) => m._id !== tempId)
          : current.map((m) => (m._id === tempId ? res.data : m)),
      });
      get().upsertChat(selectedUser, { lastMessage: previewOf(res.data) });
      return true;
    } catch (error) {
      set({ messages: get().messages.filter((m) => m._id !== tempId) });
      toast.error(getErrorMessage(error, "Your message was not sent."));
      return false;
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.patch(`/messages/edit/${messageId}`, { text });
      set({ messages: replaceIn(get().messages, res.data), editingMessage: null });
      get().hideTranslation(messageId); // the old translation no longer matches
      get().syncLastMessage(res.data);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't save your edit."));
      return false;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      set({ messages: replaceIn(get().messages, res.data) });
      get().syncLastMessage(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't delete that message."));
    }
  },

  reactToMessage: async (messageId, emoji) => {
    const { authUser } = useAuthStore.getState();
    const before = get().messages;
    // optimistic: flip my reaction right away
    set({
      messages: before.map((m) => {
        if (m._id !== messageId) return m;
        const mine = (m.reactions || []).find((r) => r.userId === authUser._id);
        const others = (m.reactions || []).filter((r) => r.userId !== authUser._id);
        return {
          ...m,
          reactions: mine?.emoji === emoji ? others : [...others, { userId: authUser._id, emoji }],
        };
      }),
    });
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      set({ messages: replaceIn(get().messages, res.data) });
    } catch (error) {
      set({ messages: before });
      toast.error(getErrorMessage(error, "Your reaction was not saved."));
    }
  },

  forwardMessage: async (messageId, userIds) => {
    try {
      const res = await axiosInstance.post("/messages/forward", { messageId, userIds });
      toast.success(`Forwarded to ${res.data.forwarded} ${res.data.forwarded === 1 ? "chat" : "chats"}`);
      set({ forwardingMessage: null });
      get().fetchChats({ silent: true });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't forward that message."));
      return false;
    }
  },

  // keeps the chats list preview in step when the newest message is edited / deleted
  syncLastMessage: (msg) => {
    const otherId = msg.senderId === useAuthStore.getState().authUser?._id ? msg.receiverId : msg.senderId;
    const chat = get().chats.find((c) => c._id === otherId);
    if (chat?.lastMessage?._id === msg._id) {
      set({
        chats: get().chats.map((c) => (c._id === otherId ? { ...c, lastMessage: previewOf(msg) } : c)),
      });
    }
  },

  // ---------------- search inside a conversation ----------------
  jumpToMessage: async (messageId) => {
    const { messages, selectedUser } = get();
    if (!messages.some((m) => m._id === messageId)) {
      try {
        const res = await axiosInstance.get(`/messages/${selectedUser._id}`, { params: { around: messageId } });
        set({ messages: res.data });
      } catch (error) {
        toast.error(getErrorMessage(error, "We couldn't open that message."));
        return;
      }
    }
    set({ jumpTarget: messageId, searchOpen: false });
  },

  // ---------------- translation ----------------
  // one message (the translate button). `silent` hides failures (live mode shows a retry link instead)
  translateMessage: async (messageId, langOverride) => {
    const lang = langOverride || usePrefsStore.getState().translateLang || "en";
    const cur = get().translations[messageId];
    if (cur?.status === "loading" || (cur?.status === "done" && cur.lang === lang)) return;
    set({ translations: { ...get().translations, [messageId]: { status: "loading", lang } } });
    try {
      const res = await axiosInstance.post("/ai/translate", { messageId, target: lang });
      set({
        translations: {
          ...get().translations,
          [messageId]: { status: "done", lang, text: res.data.text, same: res.data.same },
        },
      });
    } catch (error) {
      set({
        translations: { ...get().translations, [messageId]: { status: "error", lang, error: getErrorMessage(error) } },
      });
    }
  },

  // many messages in one request (live translation of a conversation)
  translateMessages: async (messageIds, lang) => {
    const todo = messageIds.filter((id) => {
      const t = get().translations[id];
      return !(t && (t.status === "loading" || (t.status === "done" && t.lang === lang)));
    });
    if (!todo.length) return;
    const loading = Object.fromEntries(todo.map((id) => [id, { status: "loading", lang }]));
    set({ translations: { ...get().translations, ...loading } });
    try {
      // 20 per request is the server limit
      for (let i = 0; i < todo.length; i += 20) {
        const chunk = todo.slice(i, i + 20);
        const res = await axiosInstance.post("/ai/translate-batch", { messageIds: chunk, target: lang });
        const next = { ...get().translations };
        for (const id of chunk) {
          const r = res.data.results[id];
          next[id] = r && !r.error ? { status: "done", lang, text: r.text, same: r.same } : { status: "error", lang };
        }
        set({ translations: next });
      }
    } catch (error) {
      const next = { ...get().translations };
      for (const id of todo) if (next[id]?.status === "loading") next[id] = { status: "error", lang, error: getErrorMessage(error) };
      set({ translations: next });
    }
  },

  hideTranslation: (messageId) => {
    const { [messageId]: _drop, ...rest } = get().translations;
    set({ translations: rest });
  },

  // ---------------- smart replies ----------------
  loadSuggestions: async () => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();
    const last = [...messages].reverse().find((m) => !m.isOptimistic);
    const prefs = usePrefsStore.getState();
    if (
      !prefs.smartReplies ||
      !selectedUser ||
      !last ||
      last.deletedAt ||
      !last.text ||
      last.senderId === authUser._id ||
      selectedUser.isBot
    ) {
      if (get().suggestions.replies.length) set({ suggestions: EMPTY_SUGGESTIONS });
      return;
    }
    if (get().suggestions.forMessageId === last._id) return;
    try {
      const res = await axiosInstance.post("/ai/suggestions", { userId: selectedUser._id });
      // only apply if nothing changed while we were waiting
      if (get().selectedUser?._id === selectedUser._id) {
        set({ suggestions: { forMessageId: res.data.forMessageId, replies: res.data.replies } });
      }
    } catch {
      /* suggestions are a nicety: stay silent */
    }
  },
  clearSuggestions: () => set({ suggestions: EMPTY_SUGGESTIONS }),

  // ---------------- realtime ----------------
  handleIncoming: (msg) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) return;
    const { selectedUser, messages, isSoundEnabled } = get();
    const mine = msg.senderId === authUser._id;
    const otherId = mine ? msg.receiverId : msg.senderId;
    const open = selectedUser && otherId === selectedUser._id;

    if (open) {
      if (messages.some((m) => m._id === msg._id)) return;
      set({ messages: [...messages, msg] });
    }

    // the chats list updates by itself: new rows appear, the newest conversation floats to the top
    const known = get().chats.find((c) => c._id === otherId);
    const unreadCount = mine || open ? known?.unreadCount ?? 0 : (known?.unreadCount ?? 0) + 1;
    const lastMessage = previewOf(msg);
    if (known) {
      get().upsertChat(known, { lastMessage, unreadCount });
    } else if (!loadingSender.has(otherId)) {
      loadingSender.add(otherId);
      axiosInstance
        .get(`/messages/user/${otherId}`)
        .then((res) => get().upsertChat(res.data, { lastMessage, unreadCount }))
        .catch(() => get().fetchChats({ silent: true }))
        .finally(() => loadingSender.delete(otherId));
    }

    if (!mine) {
      if (open) get().markConversationRead(otherId);
      else toast(`New message${known ? ` from ${known.fullName}` : ""}`, { icon: "💬", id: `msg-${otherId}` });
      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.play().catch(() => {});
      }
    }
  },

  handleUpdated: (msg) => {
    set({ messages: replaceIn(get().messages, msg) });
    get().syncLastMessage(msg);
  },

  // the other person opened the conversation: my messages to them are now "read"
  handleRead: ({ by, at }) => {
    const { authUser } = useAuthStore.getState();
    set({
      messages: get().messages.map((m) =>
        m.senderId === authUser?._id && m.receiverId === by && !m.readAt ? { ...m, readAt: at } : m,
      ),
    });
  },

  // after a dropped connection: fetch what we may have missed, without any visible flicker
  resync: () => {
    get().fetchChats({ silent: true });
    const open = get().selectedUser;
    if (open) get().getMessagesByUserId(open._id, { silent: true });
  },

  // attaches the realtime listeners; returns the detach function
  bindSocket: (socket) => {
    const onNew = (m) => get().handleIncoming(m);
    const onUpdated = (m) => get().handleUpdated(m);
    const onRead = (e) => get().handleRead(e);
    socket.on("newMessage", onNew);
    socket.on("messageUpdated", onUpdated);
    socket.on("messagesRead", onRead);
    return () => {
      socket.off("newMessage", onNew);
      socket.off("messageUpdated", onUpdated);
      socket.off("messagesRead", onRead);
    };
  },
}));
