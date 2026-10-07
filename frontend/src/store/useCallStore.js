import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { onRingtoneStatus, startRingtone, stopRingtone } from "../lib/ringtone";

const RING_TIMEOUT_MS = 45_000;
const FALLBACK_ICE = [{ urls: ["stun:stun.l.google.com:19302"] }];

// WebRTC objects are not serialisable state, so they live outside the store
let pc = null;
let pendingIce = []; // candidates that arrive before the remote description is set
let incomingOffer = null;
let ringTimer = null;
let iceServers = null;
let isCaller = false; // the caller is "impolite" when both sides renegotiate at once
let makingOffer = false;
let renegotiable = false; // true once the first connection is up
let screenStream = null;
let cameraTrack = null; // the camera track we swap back to after screen sharing
let rec = null; // active call recording

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
  stopRingtone();
};

const mediaErrorText = (err) =>
  err?.name === "NotAllowedError"
    ? "Allow microphone/camera access in your browser to make calls"
    : err?.name === "NotFoundError"
      ? "No microphone or camera was found"
      : err?.name === "NotReadableError"
        ? "Your microphone or camera is being used by another app"
        : "Could not start your microphone/camera";

const IDLE = {
  status: "idle", // idle | outgoing | incoming | connecting | connected
  peer: null,
  media: "audio",
  callId: null,
  localStream: null,
  localPreview: null, // what the small preview shows: camera or the shared screen
  remoteStream: null,
  remoteVideo: false, // has the other side an active video track right now
  muted: false,
  cameraOff: false,
  speakerMuted: false,
  sharing: false,
  remoteSharing: false,
  recording: false,
  recordStartedAt: null,
  remoteRecording: false,
  startedAt: null,
  soundBlocked: false, // the browser is still refusing to play the ring
};

// ---------------------------------------------------------------------------------------------
// recording: mixes both voices (and, when there is video, both pictures) into one file locally
// ---------------------------------------------------------------------------------------------
const pickMime = (video) => {
  const options = video
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => window.MediaRecorder?.isTypeSupported?.(m));
};

const drawFit = (ctx, el, x, y, w, h) => {
  const vw = el.videoWidth;
  const vh = el.videoHeight;
  if (!vw || !vh) return false;
  const scale = Math.min(w / vw, h / vh);
  ctx.drawImage(el, x + (w - vw * scale) / 2, y + (h - vh * scale) / 2, vw * scale, vh * scale);
  return true;
};

export const useCallStore = create((set, get) => {
  const stopRecording = (save = true) => {
    if (!rec) return;
    const current = rec;
    rec = null;
    current.save = save;
    try {
      if (current.recorder.state !== "inactive") current.recorder.stop();
    } catch {
      /* already stopped */
    }
    clearInterval(current.drawTimer);
    current.els?.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    current.ctx?.close().catch(() => {});
    set({ recording: false, recordStartedAt: null });
    const { peer, callId } = get();
    if (peer && callId) send("state", peer._id, callId, { recording: false });
  };

  // tears everything down and returns to idle
  const cleanup = (message) => {
    stopRinging();
    stopRecording(true);
    screenStream?.getTracks().forEach((t) => t.stop());
    screenStream = null;
    cameraTrack = null;
    get().localStream?.getTracks().forEach((t) => t.stop());
    if (pc) {
      pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = pc.onnegotiationneeded = null;
      pc.close();
    }
    pc = null;
    pendingIce = [];
    incomingOffer = null;
    makingOffer = false;
    renegotiable = false;
    set({ ...IDLE });
    if (message) toast(message, { icon: "📞" });
  };

  // is any remote video track alive and delivering frames?
  const refreshRemoteVideo = () => {
    const stream = get().remoteStream;
    const live = Boolean(stream?.getVideoTracks().some((t) => t.readyState === "live" && !t.muted));
    if (live !== get().remoteVideo) set({ remoteVideo: live });
  };

  const buildPeer = async (peerId, callId, stream) => {
    const conn = new RTCPeerConnection({ iceServers: await getIceServers() });
    stream.getTracks().forEach((t) => conn.addTrack(t, stream));
    cameraTrack = stream.getVideoTracks()[0] || null;

    conn.onicecandidate = (e) => {
      if (e.candidate) send("ice", peerId, callId, e.candidate.toJSON());
    };
    conn.ontrack = (e) => {
      const remote = e.streams[0];
      if (get().remoteStream !== remote) {
        set({ remoteStream: remote });
        remote.onremovetrack = refreshRemoteVideo;
      }
      // a video track starts "muted" until frames arrive and ends/mutes when the sender stops it
      e.track.onmute = refreshRemoteVideo;
      e.track.onunmute = refreshRemoteVideo;
      e.track.onended = refreshRemoteVideo;
      refreshRemoteVideo();
    };
    conn.onconnectionstatechange = () => {
      if (conn !== pc) return;
      if (conn.connectionState === "connected") {
        stopRinging();
        renegotiable = true;
        if (get().status !== "connected") set({ status: "connected", startedAt: Date.now() });
      } else if (conn.connectionState === "failed") {
        cleanup("Call failed - the connection could not be established");
      }
    };

    // adding / removing a track mid-call (screen sharing in a voice call) needs a new offer
    conn.onnegotiationneeded = async () => {
      if (!renegotiable || conn !== pc) return;
      try {
        makingOffer = true;
        await conn.setLocalDescription();
        send("reneg-offer", peerId, callId, conn.localDescription);
      } catch (err) {
        console.error("renegotiation:", err);
      } finally {
        makingOffer = false;
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

  const stopSharing = async (tellPeer = true) => {
    if (!screenStream) return;
    const stream = screenStream;
    screenStream = null;
    stream.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    const sender = pc?.getSenders().find((s) => s.track && stream.getTracks().includes(s.track));
    try {
      if (sender) {
        if (cameraTrack && cameraTrack.readyState === "live") await sender.replaceTrack(cameraTrack);
        else pc.removeTrack(sender); // voice call: drop the video again (renegotiates)
      }
    } catch (err) {
      console.error("stopSharing:", err);
    }
    set({ sharing: false, localPreview: get().localStream });
    const { peer, callId } = get();
    if (tellPeer && peer && callId) send("state", peer._id, callId, { sharing: false });
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
      isCaller = true;
      set({ ...IDLE, status: "outgoing", peer: user, media, callId, localStream: stream, localPreview: stream });

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
      isCaller = false;
      set({ status: "connecting", localStream: stream, localPreview: stream });
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

    // "speaker off" silences what the other person says (output device choice lives in the overlay)
    toggleSpeaker: () => set({ speakerMuted: !get().speakerMuted }),

    // ---- screen sharing: works in voice calls (adds a video track) and video calls (swaps the camera) ----
    toggleScreenShare: async () => {
      if (get().sharing) return stopSharing();
      if (!navigator.mediaDevices?.getDisplayMedia) {
        toast.error("Your browser can't share the screen");
        return;
      }
      if (!pc || get().status !== "connected") {
        toast("Screen sharing is available once the call is connected", { icon: "🖥️" });
        return;
      }
      let display;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      } catch (err) {
        if (err?.name !== "NotAllowedError") toast.error("Could not start screen sharing");
        return;
      }
      const track = display.getVideoTracks()[0];
      screenStream = display;
      track.onended = () => stopSharing(); // the browser's own "Stop sharing" button
      try {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === "video" && t.sender);
        if (sender) {
          await sender.replaceTrack(track);
        } else if (videoTransceiver && videoTransceiver.direction !== "stopped" && videoTransceiver.sender.track === null) {
          await videoTransceiver.sender.replaceTrack(track);
          videoTransceiver.direction = "sendrecv";
          videoTransceiver.sender.setStreams(display);
        } else {
          pc.addTrack(track, display);
        }
        set({ sharing: true, localPreview: display });
        const { peer, callId } = get();
        send("state", peer._id, callId, { sharing: true });
      } catch (err) {
        console.error("screen share:", err);
        stopSharing(false);
        toast.error("Could not start screen sharing");
      }
    },

    // ---- recording (local file, the other person is told) ----
    toggleRecording: () => {
      if (rec) return stopRecording(true);
      const { remoteStream, localStream, media, peer, callId } = get();
      if (!window.MediaRecorder) {
        toast.error("Your browser can't record calls");
        return;
      }
      const wantsVideo = media === "video" || get().sharing || get().remoteVideo;
      const mimeType = pickMime(wantsVideo);
      if (!mimeType) {
        toast.error("Your browser can't record this kind of call");
        return;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const dest = ctx.createMediaStreamDestination();
        [remoteStream, localStream].forEach((s) => {
          if (s?.getAudioTracks().length) {
            ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest);
          }
        });
        const tracks = [...dest.stream.getAudioTracks()];

        let drawTimer = null;
        let els = null;
        if (wantsVideo) {
          const canvas = document.createElement("canvas");
          canvas.width = 1280;
          canvas.height = 720;
          const g = canvas.getContext("2d");
          const mkVideo = (stream) => {
            const v = document.createElement("video");
            v.muted = true;
            v.playsInline = true;
            v.srcObject = stream;
            v.play().catch(() => {});
            return v;
          };
          const rv = mkVideo(remoteStream);
          const lv = mkVideo(get().localPreview || localStream);
          els = [rv, lv];
          drawTimer = setInterval(() => {
            const preview = get().localPreview || localStream;
            if (lv.srcObject !== preview) lv.srcObject = preview;
            g.fillStyle = "#05050d";
            g.fillRect(0, 0, canvas.width, canvas.height);
            drawFit(g, rv, 0, 0, canvas.width, canvas.height);
            if (lv.videoWidth) drawFit(g, lv, canvas.width - 300, canvas.height - 180, 280, 160);
          }, 1000 / 24);
          tracks.push(canvas.captureStream(24).getVideoTracks()[0]);
        }

        const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType });
        const chunks = [];
        const name = peer?.fullName || "call";
        const recObj = { recorder, ctx, drawTimer, els, save: true };
        rec = recObj;
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = () => {
          if (!chunks.length || !recObj.save) return;
          const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
          const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `chatapp-call-${name.replace(/[^\w-]+/g, "_")}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
          toast.success("Recording saved to your downloads");
        };
        recorder.start(1000);
        set({ recording: true, recordStartedAt: Date.now() });
        send("state", peer._id, callId, { recording: true });
        toast("Recording started - the other person can see it", { icon: "🔴" });
      } catch (err) {
        console.error("recording:", err);
        rec = null;
        toast.error("Could not start recording");
      }
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
        // audible only if the page was "unlocked" by an earlier tap (see lib/ringtone.js)
        startRingtone().then((audible) => get().status === "incoming" && set({ soundBlocked: !audible }));
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
      } else if (type === "reneg-offer" && pc) {
        // "perfect negotiation": when both sides offer at once the callee (polite) backs down
        const collision = makingOffer || pc.signalingState !== "stable";
        if (collision && isCaller) return;
        try {
          await pc.setRemoteDescription(payload);
          await pc.setLocalDescription();
          send("reneg-answer", state.peer._id, callId, pc.localDescription);
        } catch (err) {
          console.error("reneg-offer:", err);
        }
      } else if (type === "reneg-answer" && pc) {
        try {
          await pc.setRemoteDescription(payload);
        } catch (err) {
          console.error("reneg-answer:", err);
        }
      } else if (type === "state") {
        if (typeof payload?.recording === "boolean") {
          set({ remoteRecording: payload.recording });
          if (payload.recording) toast(`${state.peer?.fullName} started recording this call`, { icon: "🔴" });
        }
        if (typeof payload?.sharing === "boolean") {
          set({ remoteSharing: payload.sharing });
          refreshRemoteVideo();
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
      const offStatus = onRingtoneStatus((st) => {
        if (get().status === "incoming" && st.unlocked && get().soundBlocked) set({ soundBlocked: false });
      });
      return () => {
        offStatus();
        socket.off("call:signal", onSignal);
        if (get().status !== "idle") cleanup();
      };
    },
  };
});
