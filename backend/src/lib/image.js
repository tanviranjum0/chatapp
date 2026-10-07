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
