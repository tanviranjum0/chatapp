// Incoming-call ringtone that actually rings on phones.
//
// Mobile browsers only let a page make sound after the person has touched it, and a call arrives over
// the network - not from a tap - so `new Audio().play()` is silently refused. The fix is to "unlock"
// audio on the very first touch / click / key press anywhere in the app: we create one AudioContext
// then, and keep reusing it. After that the ring can start by itself at any time.
//
// The tone is synthesised (no file): a classic double ring. Where the browser supports it the phone also
// vibrates (Android). A recorded chime is the fallback if Web Audio is unavailable.

let ctx = null;
let unlocked = false;
let timer = null;
let vibrateTimer = null;
let fallback = null;
let ringing = false;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(getStatus()));

export const getStatus = () => ({ unlocked: unlocked && ctx?.state === "running" });

// lets the UI show "tap to enable sound" while audio is still locked
export const onRingtoneStatus = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const getContext = () => {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  ctx.onstatechange = notify;
  return ctx;
};

// called from a real user gesture: starts the context and plays one silent sample (the iOS unlock trick)
const unlock = () => {
  const c = getContext();
  if (!c) return;
  // a call is already ringing but was blocked: the tap that just happened lets it start now
  c.resume?.()
    .then(() => {
      if (ringing && !timer && c.state === "running") {
        fallback?.pause();
        fallback = null;
        ringOnce();
        timer = setInterval(ringOnce, 3000);
      }
      notify();
    })
    .catch(() => {});
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* some browsers refuse before the context is running */
  }
  unlocked = true;
  notify();
};

let installed = false;
export const installAudioUnlock = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const events = ["pointerdown", "touchend", "click", "keydown"];
  const handler = () => unlock();
  // stay installed: iOS suspends the context when the app is backgrounded and needs another gesture
  events.forEach((e) => window.addEventListener(e, handler, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ctx && ctx.state !== "running") ctx.resume?.().catch(() => {});
  });
};

// one "brrr": two sines a major sixth apart, like a landline
const burst = (c, at, seconds) => {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.3, at + 0.03);
  gain.gain.setValueAtTime(0.3, at + seconds - 0.05);
  gain.gain.linearRampToValueAtTime(0, at + seconds);
  gain.connect(c.destination);
  for (const freq of [440, 480]) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
  }
};

const ringOnce = () => {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.05;
  burst(ctx, t, 0.45);
  burst(ctx, t + 0.65, 0.45);
};

const startFallbackChime = () => {
  try {
    fallback = new Audio("/sounds/notification.mp3");
    fallback.loop = true;
    fallback.play().catch(() => {});
  } catch {
    /* no audio at all */
  }
};

// returns true when the ring is audible, false when the browser still blocks sound
export const startRingtone = async () => {
  if (ringing) return getStatus().unlocked;
  ringing = true;

  // phones: buzz with the ring (Android; iOS has no vibration API for web pages)
  if (navigator.vibrate) {
    const buzz = () => navigator.vibrate([700, 300, 700, 1300]);
    buzz();
    vibrateTimer = setInterval(buzz, 3000);
  }

  const c = getContext();
  if (c) {
    if (c.state !== "running") await c.resume?.().catch(() => {});
    if (c.state === "running") {
      unlocked = true;
      ringOnce();
      timer = setInterval(ringOnce, 3000);
      notify();
      return true;
    }
  }
  startFallbackChime();
  notify();
  return false;
};

export const stopRingtone = () => {
  ringing = false;
  clearInterval(timer);
  clearInterval(vibrateTimer);
  timer = vibrateTimer = null;
  navigator.vibrate?.(0);
  if (fallback) {
    fallback.pause();
    fallback = null;
  }
};
