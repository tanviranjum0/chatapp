import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { SparklesIcon, LockIcon, MailIcon, UserIcon, LoaderIcon } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import AuthShell from "../components/AuthShell";
import { fadeUp } from "../lib/motion";
import AuthField from "../components/AuthField";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const { signup, isSigningUp } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    signup(formData);
  };

  return (
    <AuthShell
      icon={SparklesIcon}
      title="Create Account"
      subtitle="Sign up for a new account"
      image="/signup.png"
      tagline="Start Your Journey Today"
      footer={
        <Link to="/login" className="auth-link">
          Already have an account? Login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Full Name"
          icon={UserIcon}
          type="text"
          autoComplete="name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="John Doe"
        />
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
          autoComplete="new-password"
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
            disabled={isSigningUp}
          >
            {isSigningUp ? <LoaderIcon className="mx-auto size-5 animate-spin" /> : "Create Account"}
          </motion.button>
        </motion.div>
      </form>
    </AuthShell>
  );
}
export default SignUpPage;
