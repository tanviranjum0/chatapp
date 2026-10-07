// shared animation presets
export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 22 } },
};

export const stagger = (delay = 0.05, start = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: start } },
});
