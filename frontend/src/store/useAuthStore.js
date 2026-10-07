import { create } from "zustand";
import { axiosInstance, SOCKET_URL, setUnauthorizedHandler } from "../lib/axios";
import { getErrorMessage } from "../lib/errors";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";
import { useCallStore } from "./useCallStore";

// the "enter the code we emailed you" step shared by sign up, 2FA login and enabling 2FA
// a real user always has an id; anything else (an HTML page from a misconfigured proxy, null...) is an error
const isUser = (data) => Boolean(data && typeof data === "object" && typeof data._id === "string");

const pendingFrom = (data) => ({
  purpose: data.purpose,
  email: data.email,
  resendAt: Date.now() + (data.resendIn ?? 60) * 1000,
  expiresAt: Date.now() + (data.expiresIn ?? 600) * 1000,
});

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isVerifying: false,
  isResending: false,
  pending: null, // { purpose, email, resendAt, expiresAt } while a code is awaited
  showAvatarPrompt: false, // the "add a profile picture" pop up right after sign up
  socket: null,
  socketStatus: "idle", // idle | connecting | online | reconnecting
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      if (!isUser(res.data)) throw new Error("unexpected response");
      set({ authUser: res.data });
      get().connectSocket();
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ pending: pendingFrom(res.data) });
      toast.success(`We emailed a 6-digit code to ${res.data.email}`);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't create your account."));
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.status === 202) {
        // two-factor is on for this account: a code was emailed
        set({ pending: pendingFrom(res.data) });
        toast.success(`We emailed a 6-digit code to ${res.data.email}`);
        return;
      }
      if (!isUser(res.data)) throw new Error("The server sent an unexpected answer. Please try again.");
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't log you in."));
    } finally {
      set({ isLoggingIn: false });
    }
  },

  verifyCode: async (code) => {
    const { pending } = get();
    if (!pending) return false;
    set({ isVerifying: true });
    if (pending.purpose === "enable2fa") {
      const ok = await get().confirmTwoFactor(code);
      set({ isVerifying: false });
      return ok;
    }
    try {
      const path = pending.purpose === "signup" ? "/auth/verify-signup" : "/auth/verify-login";
      const res = await axiosInstance.post(path, { email: pending.email, code });
      if (!isUser(res.data)) throw new Error("The server sent an unexpected answer. Please try again.");
      set({ authUser: res.data, pending: null, showAvatarPrompt: pending.purpose === "signup" });
      toast.success(pending.purpose === "signup" ? "Welcome aboard!" : "Logged in successfully");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "That code didn't work."));
      return false;
    } finally {
      set({ isVerifying: false });
    }
  },

  resendCode: async () => {
    const { pending } = get();
    if (!pending) return;
    set({ isResending: true });
    try {
      const res = await axiosInstance.post("/auth/resend-code", { email: pending.email, purpose: pending.purpose });
      set({ pending: pendingFrom(res.data) });
      toast.success("A new code is on its way");
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't resend the code."));
    } finally {
      set({ isResending: false });
    }
  },

  cancelPending: () => set({ pending: null }),
  dismissAvatarPrompt: () => set({ showAvatarPrompt: false }),

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      // the cookie may stay, but leaving the screen is still what the person asked for
      toast.error(getErrorMessage(error, "Couldn't reach the server, logged out on this device only."));
    }
    get().clearSession();
    toast.success("Logged out successfully");
  },

  // forget everything about the current user on this device
  clearSession: () => {
    get().disconnectSocket();
    useCallStore.getState().hangup();
    useChatStore.getState().reset();
    set({ authUser: null, pending: null, showAvatarPrompt: false });
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't update your picture."));
      return false;
    }
  },

  // ---- two-factor management (Settings) ----
  startTwoFactor: async (password) => {
    try {
      const res = await axiosInstance.post("/auth/two-factor/start", { password });
      set({ pending: pendingFrom(res.data) });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  },
  confirmTwoFactor: async (code) => {
    try {
      const res = await axiosInstance.post("/auth/two-factor/confirm", { code });
      set({ authUser: { ...get().authUser, ...res.data }, pending: null });
      toast.success("Two-factor authentication is on");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  },
  disableTwoFactor: async (password) => {
    try {
      const res = await axiosInstance.post("/auth/two-factor/disable", { password });
      set({ authUser: { ...get().authUser, ...res.data } });
      toast.success("Two-factor authentication is off");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  },

  connectSocket: () => {
    const { authUser, socket: existing } = get();
    if (!authUser || existing) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      // a fresh short lived token on every (re)connect: works even when the browser refuses
      // cross-site cookies (iOS/Safari). Old backends without the endpoint fall back to the cookie.
      auth: (cb) =>
        axiosInstance
          .get("/auth/socket-token")
          .then((res) => cb({ token: res.data.token }))
          .catch(() => cb({})),
      reconnectionDelayMax: 5000,
    });

    set({ socket, socketStatus: "connecting" });

    socket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

    let wasConnected = false;
    socket.on("connect", () => {
      set({ socketStatus: "online" });
      // after a reconnect we may have missed messages: quietly catch up
      if (wasConnected) useChatStore.getState().resync();
      wasConnected = true;
    });
    socket.on("disconnect", () => set({ socketStatus: "reconnecting", onlineUsers: [] }));
    socket.on("connect_error", () => set({ socketStatus: wasConnected ? "reconnecting" : "connecting" }));
  },

  disconnectSocket: () => {
    get().socket?.disconnect();
    set({ socket: null, socketStatus: "idle", onlineUsers: [] });
  },
}));

// a 401 on a normal request means the session ended (expired cookie, password changed on another device)
setUnauthorizedHandler(() => {
  const { authUser, clearSession } = useAuthStore.getState();
  if (authUser) {
    clearSession();
    toast.error("Your session ended. Please log in again.");
  }
});
