import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const RING_TIMEOUT_MS = 45_000;
const FALLBACK_ICE = [{ urls: ["stun:stun.l.google.com:19302"] }];

// WebRTC objects are not serialisable state, so they live outside the store
let pc = null;
let pendingIce = []; // candidates that arrive before the remote description is set
let incomingOffer = null;
let ringTimer = null;
let ringAudio = null;
let iceServers = null;

const send = (type, to, callId, payload, media) =>
  new Promise((resolve) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return resolve({ delivered: false });
    socket.emit("call:signal", { type, to, callId, payload, media }, (ack) =>
      resolve(ack || { delivered: false }),
    );
  });

const getIceServers = async () => {
  if (iceServers) return iceServers;
  try {
    const res = await axiosInstance.get("/calls/ice");
    iceServers = res.data.iceServers;
  } catch {
    iceServers = FALLBACK_ICE;
  }
  return iceServers;
};

const stopRinging = () => {
  clearTimeout(ringTimer);
  ringTimer = null;
  if (ringAudio) {
    ringAudio.pause();
    ringAudio = null;
  }
};

const mediaErrorText = (err) =>
  err?.name === "NotAllowedError"
    ? "Allow microphone/camera access in your browser to make calls"
    : err?.name === "NotFoundError"
      ? "No microphone or camera was found"
      : "Could not start your microphone/camera";

const IDLE = {
  status: "idle", // idle | outgoing | incoming | connecting | connected
  peer: null,
  media: "audio",
  callId: null,
  localStream: null,
  remoteStream: null,
  remoteVideo: false, // has the other side sent a video track yet
  muted: false,
  cameraOff: false,
  startedAt: null,
};

export const useCallStore = create((set, get) => {
  // tears everything down and returns to idle
  const cleanup = (message) => {
    stopRinging();
    get().localStream?.getTracks().forEach((t) => t.stop());
    if (pc) {
      pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = null;
      pc.close();
    }
    pc = null;
    pendingIce = [];
    incomingOffer = null;
    set({ ...IDLE });
    if (message) toast(message, { icon: "📞" });
  };

  const buildPeer = async (peerId, callId, stream) => {
    const conn = new RTCPeerConnection({ iceServers: await getIceServers() });
    stream.getTracks().forEach((t) => conn.addTrack(t, stream));

    conn.onicecandidate = (e) => {
      if (e.candidate) send("ice", peerId, callId, e.candidate.toJSON());
    };
    // fires once per track (audio, then video) on the same stream object, so track presence is kept in state
    conn.ontrack = (e) =>
      set({ remoteStream: e.streams[0], remoteVideo: e.streams[0].getVideoTracks().length > 0 });
    conn.onconnectionstatechange = () => {
      if (conn !== pc) return;
      if (conn.connectionState === "connected") {
        stopRinging();
        set({ status: "connected", startedAt: Date.now() });
      } else if (conn.connectionState === "failed") {
        cleanup("Call failed - the connection could not be established");
      }
    };
    pc = conn;
    return conn;
  };

  const flushIce = async () => {
    const queued = pendingIce;
    pendingIce = [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  };

  return {
    ...IDLE,

    startCall: async (user, media = "audio") => {
      if (get().status !== "idle") return;
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        toast.error("Calls are not supported in this browser");
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: media === "video" });
      } catch (err) {
        toast.error(mediaErrorText(err));
        return;
      }
      const callId = crypto.randomUUID();
      set({ ...IDLE, status: "outgoing", peer: user, media, callId, localStream: stream });

      try {
        const conn = await buildPeer(user._id, callId, stream);
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        const ack = await send("offer", user._id, callId, offer, media);
        if (get().callId !== callId) return; // cancelled meanwhile
        if (!ack.delivered) {
          cleanup(`${user.fullName} is offline`);
          return;
        }
        ringTimer = setTimeout(() => {
          send("end", user._id, callId);
          cleanup(`${user.fullName} didn't answer`);
        }, RING_TIMEOUT_MS);
      } catch (err) {
        console.error("startCall:", err);
        cleanup("Could not start the call");
      }
    },

    accept: async () => {
      const { peer, callId, media, status } = get();
      if (status !== "incoming" || !incomingOffer) return;
      stopRinging();

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: media === "video" });
      } catch (err) {
        toast.error(mediaErrorText(err));
        send("reject", peer._id, callId);
        cleanup();
        return;
      }
      set({ status: "connecting", localStream: stream });
      try {
        const conn = await buildPeer(peer._id, callId, stream);
        await conn.setRemoteDescription(incomingOffer);
        await flushIce();
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        await send("answer", peer._id, callId, answer);
      } catch (err) {
        console.error("accept:", err);
        send("end", peer._id, callId);
        cleanup("Could not connect the call");
      }
    },

    reject: () => {
      const { peer, callId, status } = get();
      if (status === "incoming" && peer) send("reject", peer._id, callId);
      cleanup();
    },

    hangup: () => {
      const { peer, callId } = get();
      if (peer && callId) send("end", peer._id, callId);
      cleanup();
    },

    toggleMute: () => {
      const next = !get().muted;
      get().localStream?.getAudioTracks().forEach((t) => (t.enabled = !next));
      set({ muted: next });
    },

    toggleCamera: () => {
      const next = !get().cameraOff;
      get().localStream?.getVideoTracks().forEach((t) => (t.enabled = !next));
      set({ cameraOff: next });
    },

    handleSignal: async (msg) => {
      const { type, callId, payload, from, media } = msg;
      const state = get();

      if (type === "offer") {
        if (state.status !== "idle") {
          send("busy", from._id, callId);
          return;
        }
        incomingOffer = payload;
        pendingIce = [];
        set({ ...IDLE, status: "incoming", peer: from, media, callId });
        ringAudio = new Audio("/sounds/notification.mp3");
        ringAudio.loop = true;
        ringAudio.play().catch(() => {});
        ringTimer = setTimeout(() => {
          send("reject", from._id, callId);
          cleanup(`Missed call from ${from.fullName}`);
        }, RING_TIMEOUT_MS);
        return;
      }

      // everything else must belong to the call we are in
      if (callId !== state.callId) return;

      if (type === "answer" && pc) {
        stopRinging();
        set({ status: "connecting" });
        try {
          await pc.setRemoteDescription(payload);
          await flushIce();
        } catch (err) {
          console.error("answer:", err);
          cleanup("Could not connect the call");
        }
      } else if (type === "ice") {
        if (pc?.remoteDescription) {
          pc.addIceCandidate(payload).catch(() => {});
        } else {
          pendingIce.push(payload);
        }
      } else if (type === "end") {
        cleanup(state.status === "incoming" ? `Missed call from ${state.peer?.fullName}` : "Call ended");
      } else if (type === "reject") {
        cleanup(`${state.peer?.fullName} declined the call`);
      } else if (type === "busy") {
        cleanup(`${state.peer?.fullName} is on another call`);
      }
    },

    bindSocket: (socket) => {
      const onSignal = (m) => get().handleSignal(m);
      socket.on("call:signal", onSignal);
      return () => {
        socket.off("call:signal", onSignal);
        if (get().status !== "idle") cleanup();
      };
    },
  };
});
