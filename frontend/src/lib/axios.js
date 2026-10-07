import axios from "axios";

const DEV = import.meta.env.MODE === "development";
const DEFAULT_PROD_BACKEND = "https://tanvir-chatapp-back.onrender.com";

// In production the API is called on the SAME origin as the site ("/api"). vercel.json proxies it to
// the backend, so the login cookie is first-party - iOS/Safari blocks cookies from other sites.
// VITE_API_URL can still point somewhere else (full url incl. /api), e.g. a local backend.
export const API_URL = import.meta.env.VITE_API_URL || (DEV ? "http://localhost:3000/api" : "/api");

// Vercel cannot proxy websockets, so the realtime socket connects straight to the backend and
// authenticates with a short lived token instead of a cookie (see useAuthStore.connectSocket).
export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (DEV ? "http://localhost:3000" : API_URL.startsWith("http") ? new URL(API_URL).origin : DEFAULT_PROD_BACKEND);

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});
