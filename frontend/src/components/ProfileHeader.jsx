import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, CameraIcon } from "lucide-react";
import { motion } from "motion/react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Avatar from "./Avatar";

const mouseClickSound = new Audio("/sounds/on-off.mp3");

const iconBtn =
  "flex size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white";

function ProfileHeader() {
  const { logout, authUser, updateProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
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
              src={selectedImg || authUser.profilePic}
              alt="User image"
              size="size-14"
              online
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="size-5 text-white" />
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
              {authUser.fullName}
            </h3>
            <p className="text-xs font-medium text-emerald-400">Online</p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex items-center gap-1">
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
    </div>
  );
}
export default ProfileHeader;
