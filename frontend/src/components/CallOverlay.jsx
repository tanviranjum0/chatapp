import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleDotIcon,
  MicIcon,
  MicOffIcon,
  MonitorUpIcon,
  MonitorXIcon,
  PhoneIcon,
  PhoneOffIcon,
  Volume2Icon,
  VolumeXIcon,
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

function Timer({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{fmt(Math.max(0, Math.floor((now - since) / 1000)))}</span>;
}

const ctrl =
  "flex size-12 shrink-0 items-center justify-center rounded-full text-snow shadow-lg transition-transform hover:scale-105 active:scale-95 sm:size-14";

// lists audio outputs where the browser lets us choose one (setSinkId: Chrome/Edge/desktop)
function SpeakerMenu({ remoteEl, speakerMuted, onToggleMute, onClose }) {
  const canRoute = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  const [devices, setDevices] = useState([]);
  const [current, setCurrent] = useState("default");

  useEffect(() => {
    if (!canRoute) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "audiooutput")))
      .catch(() => {});
  }, [canRoute]);

  const choose = async (id) => {
    try {
      await remoteEl?.setSinkId(id);
      setCurrent(id);
    } catch {
      /* the device vanished: keep the current one */
    }
  };

  return (
    <div
      role="menu"
      aria-label="Speaker"
      className="absolute bottom-16 left-1/2 z-10 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#14142b]/95 p-1.5 text-sm text-snow shadow-soft backdrop-blur-xl sm:bottom-20"
    >
      <button
        role="menuitemcheckbox"
        aria-checked={speakerMuted}
        onClick={() => {
          onToggleMute();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-white/10"
      >
        {speakerMuted ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />}
        {speakerMuted ? "Turn speaker on" : "Mute speaker"}
      </button>
      {canRoute && devices.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-white/50">Play sound on</p>
          {devices.map((d, i) => (
            <button
              key={d.deviceId || i}
              role="menuitemradio"
              aria-checked={current === d.deviceId}
              onClick={() => {
                choose(d.deviceId);
                onClose();
              }}
              className={`flex w-full items-center gap-2 truncate rounded-xl px-3 py-2 text-left hover:bg-white/10 ${
                current === d.deviceId ? "text-brand-400" : ""
              }`}
            >
              <span className="truncate">{d.label || `Speaker ${i + 1}`}</span>
            </button>
          ))}
        </>
      )}
      {!canRoute && (
        <p className="px-3 py-2 text-xs text-white/50">
          Your device chooses between earpiece and speaker automatically.
        </p>
      )}
    </div>
  );
}

function CallOverlay() {
  const status = useCallStore((s) => s.status);
  const peer = useCallStore((s) => s.peer);
  const media = useCallStore((s) => s.media);
  const localPreview = useCallStore((s) => s.localPreview);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const remoteVideo = useCallStore((s) => s.remoteVideo);
  const muted = useCallStore((s) => s.muted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const speakerMuted = useCallStore((s) => s.speakerMuted);
  const sharing = useCallStore((s) => s.sharing);
  const remoteSharing = useCallStore((s) => s.remoteSharing);
  const recording = useCallStore((s) => s.recording);
  const recordStartedAt = useCallStore((s) => s.recordStartedAt);
  const remoteRecording = useCallStore((s) => s.remoteRecording);
  const startedAt = useCallStore((s) => s.startedAt);
  const { accept, reject, hangup, toggleMute, toggleCamera, toggleSpeaker, toggleScreenShare, toggleRecording } =
    useCallStore.getState();

  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [speakerMenu, setSpeakerMenu] = useState(false);
  useStream(remoteRef, remoteStream);
  useStream(localRef, localPreview);

  const incoming = status === "incoming";
  const inCall = status !== "idle" && !incoming;
  const video = media === "video";
  const showRemoteVideo = remoteVideo;
  const showLocalPreview = (video || sharing) && Boolean(localPreview);
  const connected = status === "connected";

  const label = status === "outgoing" ? "Calling…" : status === "connecting" ? "Connecting…" : null;

  return (
    <AnimatePresence>
      {incoming && (
        // Centered with flex, NOT with translate classes: framer-motion rewrites the inline transform for
        // its slide-in, which silently dropped -translate-x-1/2 and pushed the banner off screen on phones.
        <div
          key="incoming"
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            role="alertdialog"
            aria-label={`Incoming ${media} call from ${peer.fullName}`}
            className="pointer-events-auto grid w-full max-w-md border border-white/15 bg-ink-900 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 rounded-3xl p-4 shadow-soft sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-5"
          >
            <Avatar src={peer.profilePic} alt="" size="size-14" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{peer.fullName}</p>
              <p className="truncate text-sm text-slate-400">Incoming {video ? "video" : "voice"} call…</p>
            </div>
            {/* phones: two wide, easy-to-hit buttons under the name; larger screens: round icons on the right */}
            <div className="col-span-2 grid grid-cols-2 gap-3 sm:col-span-1 sm:flex">
              <button
                onClick={reject}
                aria-label="Decline call"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 text-sm font-semibold text-snow shadow-lg transition-transform active:scale-95 sm:size-12 sm:rounded-full sm:px-0"
              >
                <PhoneOffIcon className="size-5 shrink-0" />
                <span className="sm:hidden">Decline</span>
              </button>
              <button
                onClick={accept}
                aria-label="Accept call"
                className="ring-pulse flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-snow transition-transform active:scale-95 sm:size-12 sm:rounded-full sm:px-0"
              >
                {video ? <VideoIcon className="size-5 shrink-0" /> : <PhoneIcon className="size-5 shrink-0" />}
                <span className="sm:hidden">Accept</span>
              </button>
            </div>
          </motion.div>
        </div>
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
            muted={speakerMuted}
            className={`absolute inset-0 size-full ${remoteSharing ? "object-contain" : "object-cover"} ${
              showRemoteVideo ? "" : "invisible"
            }`}
          />

          {!showRemoteVideo && (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-4">
              <div className="absolute size-72 rounded-full bg-brand-600/20 blur-3xl" />
              <Avatar src={peer.profilePic} alt={peer.fullName} size="size-36" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-6 text-center">
            <p className="text-xl font-semibold">{peer.fullName}</p>
            <p className="text-sm text-white/80" aria-live="polite">
              {label ?? <Timer since={startedAt} />}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs font-semibold">
              {recording && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1">
                  <span className="size-2 animate-pulse rounded-full bg-snow" /> REC <Timer since={recordStartedAt} />
                </span>
              )}
              {remoteRecording && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-black">
                  <CircleDotIcon className="size-3" /> {peer.fullName} is recording
                </span>
              )}
              {sharing && <span className="rounded-full bg-brand-600/90 px-3 py-1">You are sharing your screen</span>}
              {remoteSharing && <span className="rounded-full bg-brand-600/90 px-3 py-1">{peer.fullName} is sharing their screen</span>}
              {speakerMuted && <span className="rounded-full bg-white/20 px-3 py-1">Speaker muted</span>}
            </div>
          </div>

          {showLocalPreview && (
            <motion.video
              drag
              dragMomentum={false}
              ref={localRef}
              autoPlay
              muted
              playsInline
              className={`absolute bottom-28 right-4 h-36 w-24 cursor-grab rounded-2xl border border-white/20 bg-black object-cover shadow-soft sm:h-48 sm:w-36 ${
                sharing ? "" : "[transform:scaleX(-1)]"
              } ${cameraOff && !sharing ? "opacity-30" : ""}`}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            <div className="relative mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={muted}
                className={`${ctrl} ${muted ? "bg-snow !text-black" : "bg-white/20"}`}
              >
                {muted ? <MicOffIcon className="size-5 sm:size-6" /> : <MicIcon className="size-5 sm:size-6" />}
              </button>

              {video && (
                <button
                  onClick={toggleCamera}
                  aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                  aria-pressed={cameraOff}
                  className={`${ctrl} ${cameraOff ? "bg-snow !text-black" : "bg-white/20"}`}
                >
                  {cameraOff ? <VideoOffIcon className="size-5 sm:size-6" /> : <VideoIcon className="size-5 sm:size-6" />}
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setSpeakerMenu((v) => !v)}
                  aria-label="Speaker options"
                  aria-haspopup="menu"
                  aria-expanded={speakerMenu}
                  className={`${ctrl} ${speakerMuted ? "bg-snow !text-black" : "bg-white/20"}`}
                >
                  {speakerMuted ? <VolumeXIcon className="size-5 sm:size-6" /> : <Volume2Icon className="size-5 sm:size-6" />}
                </button>
                {speakerMenu && (
                  <SpeakerMenu
                    remoteEl={remoteRef.current}
                    speakerMuted={speakerMuted}
                    onToggleMute={toggleSpeaker}
                    onClose={() => setSpeakerMenu(false)}
                  />
                )}
              </div>

              {typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia && (
                <button
                  onClick={toggleScreenShare}
                  disabled={!connected}
                  aria-label={sharing ? "Stop sharing screen" : "Share screen"}
                  aria-pressed={sharing}
                  className={`${ctrl} disabled:opacity-40 ${sharing ? "bg-brand-600" : "bg-white/20"}`}
                >
                  {sharing ? <MonitorXIcon className="size-5 sm:size-6" /> : <MonitorUpIcon className="size-5 sm:size-6" />}
                </button>
              )}

              {typeof window !== "undefined" && window.MediaRecorder && (
                <button
                  onClick={toggleRecording}
                  disabled={!connected}
                  aria-label={recording ? "Stop recording" : "Record call"}
                  aria-pressed={recording}
                  className={`${ctrl} disabled:opacity-40 ${recording ? "bg-red-500" : "bg-white/20"}`}
                >
                  <CircleDotIcon className="size-5 sm:size-6" />
                </button>
              )}

              <button onClick={hangup} aria-label="End call" className={`${ctrl} bg-red-500`}>
                <PhoneOffIcon className="size-5 sm:size-6" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default CallOverlay;
