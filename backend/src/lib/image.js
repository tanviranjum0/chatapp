import cloudinary from "./cloudinary.js";

const DATA_URI = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 4_500_000; // ~3.4MB decoded, safely under the 5mb JSON body limit

export const isValidImageDataUri = (value) =>
  typeof value === "string" && value.length <= MAX_IMAGE_CHARS && DATA_URI.test(value);

export const uploadImage = async (dataUri, options = {}) => {
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: "chatapp",
    resource_type: "image",
    quality: "auto",
    fetch_format: "auto",
    ...options,
  });
  return res.secure_url;
};

// ---------- generic file attachments (documents, archives, audio) ----------
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
]);
export const MAX_FILE_CHARS = 5_600_000; // ~4MB decoded, under the 8mb JSON body limit
const FILE_URI = /^data:([a-z0-9.+\-/]+);base64,[A-Za-z0-9+/=]+$/;

// returns { ok, mimeType } for a client supplied data URI
export const checkFileDataUri = (value) => {
  if (typeof value !== "string" || value.length > MAX_FILE_CHARS) return { ok: false };
  const m = FILE_URI.exec(value);
  if (!m || !ALLOWED_FILE_TYPES.has(m[1])) return { ok: false };
  return { ok: true, mimeType: m[1] };
};

export const safeFileName = (name) =>
  String(name || "file")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(-80) || "file";

export const uploadFile = async (dataUri, name) => {
  const clean = safeFileName(name);
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: "chatapp/files",
    resource_type: "raw",
    public_id: `${Date.now().toString(36)}-${clean}`,
  });
  return { url: res.secure_url, bytes: res.bytes, name: clean };
};
