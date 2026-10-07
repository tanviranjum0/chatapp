import { memo } from "react";

// Round avatar with an optional presence dot (online = pulsing green, offline = grey).
const Avatar = memo(function Avatar({ src, alt = "", size = "size-12", online, className = "" }) {
  return (
    <div className={`relative shrink-0 ${size} ${className}`}>
      <img
        src={src || "/avatar.png"}
        alt={alt}
        loading="lazy"
        className="size-full rounded-full object-cover ring-2 ring-white/10"
      />
      {online !== undefined && (
        <span className="absolute bottom-0 right-0 flex size-3.5">
          {online && (
            <span className="absolute inline-flex size-full animate-ping2 rounded-full bg-emerald-400/70" />
          )}
          <span
            className={`relative inline-flex size-3.5 rounded-full border-2 border-ink-900 ${
              online ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
        </span>
      )}
    </div>
  );
});
export default Avatar;
