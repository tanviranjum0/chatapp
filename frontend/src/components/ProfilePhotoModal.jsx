import { useRef, useState } from "react";
import { CameraIcon, ImagePlusIcon, LoaderIcon } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { useAuthStore } from "../store/useAuthStore";
import { resizeToSquare } from "../lib/imageUtils";

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // before shrinking: phone photos are big

// shown right after an account is created: add a photo now or skip
function ProfilePhotoModal() {
  const authUser = useAuthStore((s) => s.authUser);
  const open = useAuthStore((s) => s.showAvatarPrompt);
  const dismiss = useAuthStore((s) => s.dismissAvatarPrompt);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) return toast.error("That photo is too large (max 15MB).");
    try {
      setPreview(await resizeToSquare(file));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const save = async () => {
    setSaving(true);
    const ok = await updateProfile({ profilePic: preview });
    setSaving(false);
    if (ok) {
      setPreview(null);
      dismiss();
    }
  };

  const skip = () => {
    setPreview(null);
    dismiss();
  };

  return (
    <Modal open={Boolean(open && authUser)} onClose={skip} title="Add a profile picture">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm text-slate-400">
          Help your friends recognise you, {authUser?.fullName?.split(" ")[0]}. You can change it any time.
        </p>

        <div className="relative">
          <Avatar src={preview || authUser?.profilePic} alt="Your picture" size="size-36" />
          {!preview && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
              <ImagePlusIcon className="size-8 text-snow" />
            </span>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={choose} className="hidden" aria-label="Choose a photo" />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={choose}
          className="hidden"
          aria-label="Take a photo"
        />

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
          >
            <ImagePlusIcon className="size-4" /> Choose photo
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 sm:hidden"
          >
            <CameraIcon className="size-4" /> Take photo
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button onClick={save} disabled={!preview || saving} className="auth-btn">
            {saving ? <LoaderIcon className="mx-auto size-5 animate-spin" /> : "Save and continue"}
          </button>
          <button onClick={skip} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white">
            Skip for now
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default ProfilePhotoModal;
