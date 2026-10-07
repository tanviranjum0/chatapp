import { motion } from "motion/react";
import { fadeUp, stagger } from "../lib/motion";


// Shared two-column card for the login / signup pages.
function AuthShell({ icon, title, subtitle, children, footer, image, tagline }) {
  const Icon = icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -12 }}
      transition={{ type: "spring", stiffness: 160, damping: 22 }}
      className="glass-strong mx-4 flex max-h-[96dvh] w-full max-w-5xl overflow-hidden overflow-y-auto rounded-3xl shadow-soft"
    >
      {/* FORM COLUMN */}
      <motion.div
        variants={stagger(0.08, 0.1)}
        initial="hidden"
        animate="show"
        className="flex w-full items-center justify-center p-6 sm:p-10 md:w-1/2"
      >
        <div className="w-full max-w-md">
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.08 }}
              transition={{ duration: 0.5 }}
              className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-bloom-500 shadow-glow"
            >
              <Icon className="size-8 text-white" />
            </motion.div>
            <h2 className="text-gradient animate-gradient text-3xl font-extrabold">{title}</h2>
            <p className="mt-2 text-slate-400">{subtitle}</p>
          </motion.div>

          {children}

          <motion.div variants={fadeUp} className="mt-6 text-center">
            {footer}
          </motion.div>
        </div>
      </motion.div>

      {/* ILLUSTRATION COLUMN */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-white/10 bg-gradient-to-br from-brand-600/20 via-transparent to-bloom-500/10 p-8 md:flex">
        <div className="absolute size-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative text-center">
          <img
            src={image}
            alt="People using mobile devices"
            width="512"
            height="512"
            decoding="async"
            className="mx-auto w-full max-w-sm animate-float object-contain drop-shadow-[0_20px_40px_rgba(109,124,255,.35)]"
          />
          <h3 className="text-gradient mt-6 text-xl font-bold">{tagline}</h3>
          <div className="mt-4 flex justify-center gap-3">
            {["Free", "Easy Setup", "Private"].map((b, i) => (
              <motion.span
                key={b}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="auth-badge"
              >
                {b}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default AuthShell;
