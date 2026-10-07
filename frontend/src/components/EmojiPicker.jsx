import { useState } from "react";
import { EMOJI_GROUPS, STICKERS } from "../lib/chatUtils.js";

// small dependency-free picker: emoji for the text box / reactions, plus big "stickers"
function EmojiPicker({ onPick, onSticker, className = "" }) {
  const [tab, setTab] = useState(onSticker ? "stickers" : EMOJI_GROUPS[0].id);
  const group = EMOJI_GROUPS.find((g) => g.id === tab);

  return (
    <div
      className={`glass-strong w-72 overflow-hidden rounded-2xl shadow-soft ${className}`}
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="flex gap-1 border-b border-white/10 p-1.5">
        {onSticker && (
          <button
            type="button"
            onClick={() => setTab("stickers")}
            aria-label="Stickers"
            className={`rounded-lg px-2 py-1 text-sm ${tab === "stickers" ? "bg-brand-500/25" : "hover:bg-white/10"}`}
          >
            ⭐
          </button>
        )}
        {EMOJI_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setTab(g.id)}
            aria-label={g.id}
            className={`rounded-lg px-2 py-1 text-base ${tab === g.id ? "bg-brand-500/25" : "hover:bg-white/10"}`}
          >
            {g.icon}
          </button>
        ))}
      </div>
      <div className="h-52 overflow-y-auto p-2">
        {tab === "stickers" ? (
          <div className="grid grid-cols-4 gap-1">
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSticker(s)}
                className="rounded-xl p-1 text-4xl transition-transform hover:scale-110 hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5">
            {group.emoji.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => onPick(e)}
                className="rounded-lg p-1 text-xl transition-transform hover:scale-125 hover:bg-white/10"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default EmojiPicker;
