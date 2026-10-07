import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeftIcon, LoaderIcon, MailCheckIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { fadeUp } from "../lib/motion";

const LEAD = {
  signup: "Enter the 6-digit code we emailed to confirm your address and finish creating your account.",
  login: "Two-factor authentication is on. Enter the 6-digit code we emailed you.",
  enable2fa: "Enter the 6-digit code we emailed you to turn on two-factor authentication.",
};

// the "check your email" step. One real <input> so paste, password managers and the iOS
// "from Messages / Mail" suggestion all work (autocomplete=one-time-code).
function VerifyCodeForm({ onBack, compact = false }) {
  const pending = useAuthStore((s) => s.pending);
  const isVerifying = useAuthStore((s) => s.isVerifying);
  const isResending = useAuthStore((s) => s.isResending);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const resendCode = useAuthStore((s) => s.resendCode);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (!pending) return null;
  const wait = Math.max(0, Math.ceil((pending.resendAt - now) / 1000));
  const expired = now > pending.expiresAt;

  const submit = async (value) => {
    if (value.length !== 6 || isVerifying) return;
    const ok = await verifyCode(value);
    if (!ok) {
      setCode("");
      inputRef.current?.focus();
    }
  };

  const onChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) submit(digits); // submit as soon as the last digit lands
  };

  return (
    <motion.form
      variants={fadeUp}
      onSubmit={(e) => {
        e.preventDefault();
        submit(code);
      }}
      className="space-y-5"
      aria-label="Email verification"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
        <MailCheckIcon className="mt-0.5 size-6 shrink-0 text-brand-400" />
        <div className="text-sm text-slate-300">
          <p>{LEAD[pending.purpose]}</p>
          <p className="mt-1 break-all font-semibold text-white">{pending.email}</p>
        </div>
      </div>

      <div>
        <label htmlFor="otp" className="auth-input-label">
          Verification code
        </label>
        <input
          id="otp"
          ref={inputRef}
          value={code}
          onChange={onChange}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          aria-describedby="otp-help"
          className="input !pl-4 text-center text-2xl font-bold tracking-[0.6em]"
        />
        <p id="otp-help" className="mt-2 text-xs text-slate-500">
          {expired ? "This code has expired - request a new one." : "The code is valid for 10 minutes. Check your spam folder too."}
        </p>
      </div>

      <button className="auth-btn" type="submit" disabled={isVerifying || code.length !== 6}>
        {isVerifying ? <LoaderIcon className="mx-auto size-5 animate-spin" /> : "Verify"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeftIcon className="size-4" /> {compact ? "Cancel" : "Back"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCode("");
            resendCode();
          }}
          disabled={wait > 0 || isResending}
          className="rounded-lg px-2 py-1.5 font-medium text-brand-400 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent"
        >
          {isResending ? "Sending…" : wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </div>
    </motion.form>
  );
}
export default VerifyCodeForm;
