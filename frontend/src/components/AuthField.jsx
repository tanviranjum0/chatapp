import { motion } from "motion/react";
import { fadeUp } from "../lib/motion";

function AuthField({ label, icon, ...inputProps }) {
  const Icon = icon;
  return (
    <motion.div variants={fadeUp} className="field">
      <label className="auth-input-label">{label}</label>
      <div className="relative">
        <Icon className="auth-input-icon" />
        <input className="input" {...inputProps} />
      </div>
    </motion.div>
  );
}
export default AuthField;
