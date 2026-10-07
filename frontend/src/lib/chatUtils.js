import {
  CloudIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileVideoIcon,
  GithubIcon,
  LinkIcon,
  PresentationIcon,
} from "lucide-react";

export const LANGUAGES = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese",
  ru: "Russian", ar: "Arabic", hi: "Hindi", bn: "Bengali", ur: "Urdu", zh: "Chinese",
  ja: "Japanese", ko: "Korean", tr: "Turkish", id: "Indonesian", nl: "Dutch", pl: "Polish",
  vi: "Vietnamese", th: "Thai",
};

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const split = (s) => s.split(/\s+/).filter(Boolean);

export const EMOJI_GROUPS = [
  {
    id: "smileys",
    icon: "😀",
    emoji: split(
      "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖",
    ),
  },
  {
    id: "people",
    icon: "👋",
    emoji: split(
      "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 👀 👅 👄 🧠 🫶 🫡",
    ),
  },
  {
    id: "hearts",
    icon: "❤️",
    emoji: split(
      "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🌟 💫 🔥 💥 🎉 🎊 🎁 🏆 🥇 💯 ✅ ❌ ⚡ 💤",
    ),
  },
  {
    id: "nature",
    icon: "🌿",
    emoji: split(
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦋 🐝 🐢 🐍 🐙 🐬 🐳 🌸 🌼 🌻 🌹 🌷 🌲 🌴 🌵 🍀 🍁 🌈 ☀️ 🌙 ⛅ ❄️ 🌊",
    ),
  },
  {
    id: "food",
    icon: "🍕",
    emoji: split(
      "🍎 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥑 🍅 🥕 🌽 🍞 🧀 🍳 🥞 🍔 🍟 🍕 🌭 🌮 🌯 🍝 🍜 🍣 🍤 🍦 🍩 🍪 🎂 🍫 🍿 ☕ 🍵 🍺 🍷 🥂 🥤",
    ),
  },
  {
    id: "objects",
    icon: "💡",
    emoji: split(
      "⚽ 🏀 🏈 ⚾ 🎾 🏐 🎮 🎯 🎲 🎸 🎹 🎧 🎤 🎬 📷 📱 💻 ⌨️ 🖥️ 💡 🔋 📚 ✏️ 📌 📎 🔑 🔒 🚗 ✈️ 🚀 🏠 ⏰ 💰 💎 🎈",
    ),
  },
];

// large single emoji that are sent as "stickers"
export const STICKERS = split(
  "🥳 😎 🤩 😭 🥹 😴 🤯 🙌 👏 🔥 💯 🎉 🫶 😂 🤝 🙈 🐱 🐶 🦄 🍕 ☕ 🚀 🌈 ❤️",
);

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s)+$/u;

// text made of 1-3 emoji only is shown big, without a bubble
export const isStickerText = (text) => {
  if (!text || !EMOJI_ONLY.test(text)) return false;
  const count = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim())]
    .length;
  return count > 0 && count <= 3;
};

export const formatBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export const fileIconFor = (mime = "", name = "") => {
  if (mime.startsWith("audio/")) return FileAudioIcon;
  if (mime.startsWith("video/")) return FileVideoIcon;
  if (mime.includes("zip")) return FileArchiveIcon;
  if (mime.includes("sheet") || mime.includes("excel") || /\.(csv|xlsx?)$/i.test(name))
    return FileSpreadsheetIcon;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return PresentationIcon;
  if (mime.startsWith("text/") || mime.includes("pdf") || mime.includes("word")) return FileTextIcon;
  return FileIcon;
};

const URL_RE = /https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/gi;

export const extractUrls = (text = "") => [...new Set(text.match(URL_RE) || [])].slice(0, 3);

// cloud-storage links get a friendlier card
export const describeLink = (raw) => {
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "drive.google.com") return { label: "Google Drive", icon: CloudIcon, host: h };
    if (h === "docs.google.com") return { label: "Google Docs", icon: FileTextIcon, host: h };
    if (h.endsWith("dropbox.com")) return { label: "Dropbox", icon: CloudIcon, host: h };
    if (h === "onedrive.live.com" || h === "1drv.ms" || h.endsWith("sharepoint.com"))
      return { label: "OneDrive", icon: CloudIcon, host: h };
    if (h === "github.com" || h === "gist.github.com")
      return { label: "GitHub", icon: GithubIcon, host: h };
    return { label: h, icon: LinkIcon, host: h, generic: true };
  } catch {
    return null;
  }
};

// splits text into plain strings and {url} parts so links render safely (no innerHTML)
export const linkify = (text = "") => {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ url: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

export const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
