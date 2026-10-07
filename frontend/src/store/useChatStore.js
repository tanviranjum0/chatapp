import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { usePrefsStore } from "./usePrefsStore";

const errorText = (error) => error.response?.data?.message || "Something went wrong";

// swaps one message inside a list (by id), leaving the rest untouched
const replaceIn = (list, msg) => list.map((m) => (m._id === msg._id ? { ...m, ...msg } : m));

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  // composer / overlay state
  replyingTo: null,
  editingMessage: null,
  forwardingMessage: null,
  searchOpen: false,
  lightbox: null, // image url shown full screen
  jumpTarget: null, // message id the list should scroll to
  translations: {}, // messageId -> { status, text, lang }
  suggestions: { forMessageId: null, replies: [] },

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) =>
    set({
      selectedUser,
      replyingTo: null,
      editingMessage: null,
      forwardingMessage: null,
      searchOpen: false,
      jumpTarget: null,
      suggestions: { forMessageId: null, replies: [] },
    }),

  setReplyingTo: (replyingTo) => set({ replyingTo, editingMessage: null }),
  setEditingMessage: (editingMessage) => set({ editingMessage, replyingTo: null }),
  setForwardingMessage: (forwardingMessage) => set({ forwardingMessage }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  clearJumpTarget: () => set({ jumpTarget: null }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      // ignore a slow response for a conversation the user already left
      if (get().selectedUser?._id === userId) set({ messages: res.data });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, replyingTo } = get();
    const { authUser } = useAuthStore.getState();
    const tempId = `temp-${Date.now()}`;

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
      get().touchChat(selectedUser);
      return true;
    } catch (error) {
      set({ messages: get().messages.filter((m) => m._id !== tempId) });
      toast.error(errorText(error));
      return false;
    }
  },

  // makes sure the person we just wrote to shows up in the "Chats" tab
  touchChat: (user) => {
    if (!get().chats.some((c) => c._id === user._id)) set({ chats: [user, ...get().chats] });
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.patch(`/messages/edit/${messageId}`, { text });
      set({ messages: replaceIn(get().messages, res.data), editingMessage: null });
      // the old translation no longer matches
      const { [messageId]: _drop, ...rest } = get().translations;
      set({ translations: rest });
      return true;
    } catch (error) {
      toast.error(errorText(error));
      return false;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}`);
      set({ messages: replaceIn(get().messages, res.data) });
    } catch (error) {
      toast.error(errorText(error));
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
      toast.error(errorText(error));
    }
  },

  forwardMessage: async (messageId, userIds) => {
    try {
      const res = await axiosInstance.post("/messages/forward", { messageId, userIds });
      toast.success(`Forwarded to ${res.data.forwarded} ${res.data.forwarded === 1 ? "chat" : "chats"}`);
      set({ forwardingMessage: null });
      get().getMyChatPartners();
      return true;
    } catch (error) {
      toast.error(errorText(error));
      return false;
    }
  },

  // ---- search: jump to a result, loading the surrounding history when it is not on screen ----
  jumpToMessage: async (messageId) => {
    const { messages, selectedUser } = get();
    if (!messages.some((m) => m._id === messageId)) {
      try {
        const res = await axiosInstance.get(`/messages/${selectedUser._id}`, {
          params: { around: messageId },
        });
        set({ messages: res.data });
      } catch (error) {
        toast.error(errorText(error));
        return;
      }
    }
    set({ jumpTarget: messageId, searchOpen: false });
  },

  // ---- translation ----
  translateMessage: async (messageId, langOverride) => {
    const lang = langOverride || usePrefsStore.getState().translateLang || "en";
    const cur = get().translations[messageId];
    if (cur?.status === "loading" || (cur?.status === "done" && cur.lang === lang)) return;
    set({ translations: { ...get().translations, [messageId]: { status: "loading", lang } } });
    try {
      const res = await axiosInstance.post("/ai/translate", { messageId, target: lang });
      set({
        translations: { ...get().translations, [messageId]: { status: "done", lang, text: res.data.text } },
      });
    } catch (error) {
      const { [messageId]: _drop, ...rest } = get().translations;
      set({ translations: rest });
      toast.error(errorText(error));
    }
  },
  hideTranslation: (messageId) => {
    const { [messageId]: _drop, ...rest } = get().translations;
    set({ translations: rest });
  },

  // ---- smart replies ----
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
      if (get().suggestions.replies.length) set({ suggestions: { forMessageId: null, replies: [] } });
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
  clearSuggestions: () => set({ suggestions: { forMessageId: null, replies: [] } }),

  // ---- realtime ----
  handleIncoming: (msg) => {
    const { authUser } = useAuthStore.getState();
    const { selectedUser, messages, isSoundEnabled } = get();
    const otherId = msg.senderId === authUser._id ? msg.receiverId : msg.senderId;

    if (selectedUser && otherId === selectedUser._id) {
      if (messages.some((m) => m._id === msg._id)) return;
      set({ messages: [...messages, msg] });
    } else if (msg.senderId !== authUser._id) {
      // somebody else wrote while another chat is open
      const sender = get().allContacts.find((u) => u._id === msg.senderId);
      toast(`New message${sender ? ` from ${sender.fullName}` : ""}`, { icon: "💬" });
      get().getMyChatPartners();
    }

    if (msg.senderId !== authUser._id && isSoundEnabled) {
      const notificationSound = new Audio("/sounds/notification.mp3");
      notificationSound.currentTime = 0;
      notificationSound.play().catch((e) => console.log("Audio play failed:", e));
    }
  },

  handleUpdated: (msg) => set({ messages: replaceIn(get().messages, msg) }),

  // attaches the realtime listeners; returns the detach function
  bindSocket: (socket) => {
    const onNew = (m) => get().handleIncoming(m);
    const onUpdated = (m) => get().handleUpdated(m);
    socket.on("newMessage", onNew);
    socket.on("messageUpdated", onUpdated);
    return () => {
      socket.off("newMessage", onNew);
      socket.off("messageUpdated", onUpdated);
    };
  },
}));
