import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MailIcon, LoaderIcon, LockIcon, MessageCircleHeartIcon, ShieldCheckIcon } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import AuthShell from "../components/AuthShell";
import { fadeUp } from "../lib/motion";
import AuthField from "../components/AuthField";
import VerifyCodeForm from "../components/VerifyCodeForm";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const pending = useAuthStore((s) => s.pending);
  const cancelPending = useAuthStore((s) => s.cancelPending);

  useEffect(() => {
    if (useAuthStore.getState().pending?.purpose !== "login") cancelPending();
  }, [cancelPending]);

  const verifying = pending?.purpose === "login";

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <AuthShell
      icon={verifying ? ShieldCheckIcon : MessageCircleHeartIcon}
      title={verifying ? "Two-step verification" : "Welcome Back"}
      subtitle={verifying ? "Confirm it's really you" : "Login to access to your account"}
      image="/login.png"
      tagline="Connect anytime, anywhere"
      footer={
        <Link to="/signup" className="auth-link">
          Don't have an account? Sign Up
        </Link>
      }
    >
      {verifying ? (
        <VerifyCodeForm onBack={cancelPending} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
          />

          <motion.div variants={fadeUp}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="auth-btn"
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <LoaderIcon className="mx-auto size-5 animate-spin" /> : "Sign In"}
            </motion.button>
          </motion.div>
        </form>
      )}
    </AuthShell>
  );
}
export default LoginPage;
