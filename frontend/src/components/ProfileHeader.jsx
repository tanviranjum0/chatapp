import { Suspense, lazy, useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, CameraIcon, SettingsIcon, BotIcon } from "lucide-react";
import { motion } from "motion/react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Avatar from "./Avatar";
import toast from "react-hot-toast";
import { resizeToSquare } from "../lib/imageUtils";
const SettingsModal = lazy(() => import("./SettingsModal"));
const BotsModal = lazy(() => import("./BotsModal"));

const mouseClickSound = new Audio("/sounds/on-off.mp3");

const iconBtn =
  "flex size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white";

function ProfileHeader() {
  const logout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.authUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isSoundEnabled = useChatStore((s) => s.isSoundEnabled);
  const toggleSound = useChatStore((s) => s.toggleSound);
  const [selectedImg, setSelectedImg] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [botsOpen, setBotsOpen] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      // shrunk to 512px first: a phone photo is several MB, an avatar needs ~80KB
      const base64Image = await resizeToSquare(file);
      setSelectedImg(base64Image); // instant preview
      const ok = await updateProfile({ profilePic: base64Image });
      if (!ok) setSelectedImg(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="border-b border-white/10 p-5">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* AVATAR */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative shrink-0 rounded-full"
            onClick={() => fileInputRef.current.click()}
            aria-label="Change profile picture"
          >
            <Avatar
              src={selectedImg || authUser?.profilePic}
              alt="User image"
              size="size-14"
              online
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="size-5 text-snow" />
            </span>
          </motion.button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* USERNAME & ONLINE TEXT */}
          <div className="min-w-0">
            <h3 className="max-w-[150px] truncate text-base font-semibold text-white">
              {authUser?.fullName}
            </h3>
            <p className="text-xs font-medium text-emerald-400">Online</p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            className={iconBtn}
            aria-label="Bots and integrations"
            title="Bots & integrations"
            onClick={() => setBotsOpen(true)}
          >
            <BotIcon className="size-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85, rotate: 30 }}
            className={iconBtn}
            aria-label="Settings"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon className="size-5" />
          </motion.button>

          {/* SOUND TOGGLE BTN */}
          <motion.button
            whileTap={{ scale: 0.85, rotate: -10 }}
            className={iconBtn}
            aria-label="Toggle sounds"
            onClick={() => {
              // play click sound before toggling
              mouseClickSound.currentTime = 0; // reset to start
              mouseClickSound.play().catch((error) => console.log("Audio play failed:", error));
              toggleSound();
            }}
          >
            {isSoundEnabled ? (
              <Volume2Icon className="size-5 text-brand-400" />
            ) : (
              <VolumeOffIcon className="size-5" />
            )}
          </motion.button>

          {/* LOGOUT BTN */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            className={`${iconBtn} hover:!bg-red-500/15 hover:!text-red-400`}
            aria-label="Log out"
            onClick={logout}
          >
            <LogOutIcon className="size-5" />
          </motion.button>
        </div>
      </div>
      <Suspense fallback={null}>
        {settingsOpen && <SettingsModal open onClose={() => setSettingsOpen(false)} />}
        {botsOpen && <BotsModal open onClose={() => setBotsOpen(false)} />}
      </Suspense>
    </div>
  );
}
export default ProfileHeader;
