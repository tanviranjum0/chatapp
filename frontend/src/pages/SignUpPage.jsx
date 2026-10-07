import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { SparklesIcon, LockIcon, MailIcon, UserIcon, LoaderIcon, MailCheckIcon } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import AuthShell from "../components/AuthShell";
import { fadeUp } from "../lib/motion";
import AuthField from "../components/AuthField";
import VerifyCodeForm from "../components/VerifyCodeForm";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const signup = useAuthStore((s) => s.signup);
  const isSigningUp = useAuthStore((s) => s.isSigningUp);
  const pending = useAuthStore((s) => s.pending);
  const cancelPending = useAuthStore((s) => s.cancelPending);

  // a half finished login/2FA code step must not follow the user onto this page
  useEffect(() => {
    if (useAuthStore.getState().pending?.purpose !== "signup") cancelPending();
  }, [cancelPending]);

  const verifying = pending?.purpose === "signup";

  const handleSubmit = (e) => {
    e.preventDefault();
    signup(formData);
  };

  return (
    <AuthShell
      icon={verifying ? MailCheckIcon : SparklesIcon}
      title={verifying ? "Check your email" : "Create Account"}
      subtitle={verifying ? "One quick step to verify it's you" : "Sign up for a new account"}
      image="/signup.png"
      tagline="Start Your Journey Today"
      footer={
        <Link to="/login" className="auth-link">
          Already have an account? Login
        </Link>
      }
    >
      {verifying ? (
        <VerifyCodeForm onBack={cancelPending} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            label="Full Name"
            icon={UserIcon}
            type="text"
            autoComplete="name"
            required
            maxLength={50}
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="John Doe"
          />
          <AuthField
            label="Email"
            icon={MailIcon}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="johndoe@gmail.com"
          />
          <AuthField
            label="Password"
            icon={LockIcon}
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            maxLength={72}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="At least 6 characters"
          />

          <motion.div variants={fadeUp}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="auth-btn"
              type="submit"
              disabled={isSigningUp}
            >
              {isSigningUp ? <LoaderIcon className="mx-auto size-5 animate-spin" /> : "Continue"}
            </motion.button>
            <p className="mt-3 text-center text-xs text-slate-500">
              We'll email you a 6-digit code to confirm your address.
            </p>
          </motion.div>
        </form>
      )}
    </AuthShell>
  );
}
export default SignUpPage;
