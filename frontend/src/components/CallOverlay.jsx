import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import Avatar from "./Avatar";

function useStream(ref, stream) {
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null;
  }, [ref, stream]);
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function CallTimer({ startedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{fmt(Math.max(0, Math.floor((now - startedAt) / 1000)))}</span>;
}

const ctrl =
  "flex size-14 items-center justify-center rounded-full text-snow shadow-lg transition-transform hover:scale-105 active:scale-95";

function CallOverlay() {
  const { status, peer, media, localStream, remoteStream, remoteVideo, muted, cameraOff, startedAt } =
    useCallStore();
  const { accept, reject, hangup, toggleMute, toggleCamera } = useCallStore.getState();

  const remoteRef = useRef(null);
  const localRef = useRef(null);
  useStream(remoteRef, remoteStream);
  useStream(localRef, localStream);

  const incoming = status === "incoming";
  const inCall = status !== "idle" && !incoming;
  const video = media === "video";
  const remoteVideoOn = video && remoteVideo;

  const label =
    status === "outgoing"
      ? "Calling…"
      : status === "connecting"
        ? "Connecting…"
        : status === "connected"
          ? null
          : "";

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          key="incoming"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          role="alertdialog"
          aria-label={`Incoming ${media} call from ${peer.fullName}`}
          className="glass-strong fixed left-1/2 top-4 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-4 rounded-3xl p-4 shadow-soft"
        >
          <Avatar src={peer.profilePic} alt={peer.fullName} size="size-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{peer.fullName}</p>
            <p className="text-sm text-slate-400">Incoming {video ? "video" : "voice"} call…</p>
          </div>
          <button
            onClick={reject}
            aria-label="Decline call"
            className={`${ctrl} !size-12 bg-red-500`}
          >
            <PhoneOffIcon className="size-5" />
          </button>
          <button
            onClick={accept}
            aria-label="Accept call"
            className={`${ctrl} !size-12 animate-pulse bg-emerald-500`}
          >
            {video ? <VideoIcon className="size-5" /> : <PhoneIcon className="size-5" />}
          </button>
        </motion.div>
      )}

      {inCall && (
        <motion.div
          key="call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={`Call with ${peer.fullName}`}
          className="fixed inset-0 z-[70] flex flex-col bg-[#05050d] text-snow"
        >
          {/* remote media: the element always exists so audio plays even without video */}
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className={`absolute inset-0 size-full object-cover ${remoteVideoOn ? "" : "invisible"}`}
          />

          {!remoteVideoOn && (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-4">
              <div className="absolute size-72 rounded-full bg-brand-600/20 blur-3xl" />
              <Avatar src={peer.profilePic} alt={peer.fullName} size="size-36" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-6 text-center">
            <p className="text-xl font-semibold">{peer.fullName}</p>
            <p className="text-sm text-white/80" aria-live="polite">
              {label ?? <CallTimer startedAt={startedAt} />}
            </p>
          </div>

          {video && (
            <motion.video
              drag
              dragMomentum={false}
              ref={localRef}
              autoPlay
              muted
              playsInline
              className={`absolute bottom-28 right-4 h-40 w-28 cursor-grab rounded-2xl border border-white/20 object-cover shadow-soft [transform:scaleX(-1)] sm:h-48 sm:w-36 ${
                cameraOff ? "opacity-30" : ""
              }`}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-5 bg-gradient-to-t from-black/70 to-transparent p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              aria-pressed={muted}
              className={`${ctrl} ${muted ? "bg-snow !text-black" : "bg-white/20"}`}
            >
              {muted ? <MicOffIcon className="size-6" /> : <MicIcon className="size-6" />}
            </button>
            {video && (
              <button
                onClick={toggleCamera}
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                aria-pressed={cameraOff}
                className={`${ctrl} ${cameraOff ? "bg-snow !text-black" : "bg-white/20"}`}
              >
                {cameraOff ? <VideoOffIcon className="size-6" /> : <VideoIcon className="size-6" />}
              </button>
            )}
            <button onClick={hangup} aria-label="End call" className={`${ctrl} bg-red-500`}>
              <PhoneOffIcon className="size-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default CallOverlay;
