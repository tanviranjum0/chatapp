import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MailIcon, LoaderIcon, LockIcon, MessageCircleHeartIcon } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import AuthShell from "../components/AuthShell";
import { fadeUp } from "../lib/motion";
import AuthField from "../components/AuthField";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <AuthShell
      icon={MessageCircleHeartIcon}
      title="Welcome Back"
      subtitle="Login to access to your account"
      image="/login.png"
      tagline="Connect anytime, anywhere"
      footer={
        <Link to="/signup" className="auth-link">
          Don't have an account? Sign Up
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          icon={MailIcon}
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="johndoe@gmail.com"
        />
        <AuthField
          label="Password"
          icon={LockIcon}
          type="password"
          autoComplete="current-password"
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
    </AuthShell>
  );
}
export default LoginPage;
