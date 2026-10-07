import axios from "axios";

const DEV = import.meta.env.MODE === "development";
const DEFAULT_PROD_BACKEND = "https://tanvir-chatapp-back.onrender.com";

// In production the API is called on the SAME origin as the site ("/api"). vercel.json proxies it to
// the backend, so the login cookie is first-party - iOS/Safari and Android Chrome refuse cookies that a
// different site (like onrender.com) tries to set, which shows up as "Unauthorized - No token provided".
//
// VITE_API_BASE may only point at the same origin or at localhost. Any other absolute URL is ignored on
// purpose: a stray value in the hosting dashboard must never be able to break login for everyone.
const configured = import.meta.env.VITE_API_BASE;
const isSafeBase = (url) => {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url);
    return u.origin === window.location.origin || ["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
};
if (configured && !isSafeBase(configured)) {
  console.warn(`VITE_API_BASE (${configured}) is on another site and was ignored - using the same-origin /api proxy.`);
}
export const API_URL = isSafeBase(configured) ? configured : DEV ? "http://localhost:3000/api" : "/api";

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

// ---- resilience --------------------------------------------------------------------------------
// The free Render server falls asleep and answers 502/503/504 (or nothing) for a while after waking.
// Idempotent reads are retried quietly with a growing delay instead of showing an error.
const RETRY_DELAYS = [800, 2000, 4500];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// anyone interested in "your session ended" (the auth store) registers here
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

// requests where a 401 is an expected answer, not a dead session
const AUTH_PROBES = ["/auth/check", "/auth/login", "/auth/signup", "/auth/verify-", "/auth/resend-code", "/auth/two-factor"];

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    const transient = !error.response ? error.code !== "ERR_CANCELED" : [502, 503, 504].includes(status);
    if (config && config.method === "get" && transient) {
      config.__retries = (config.__retries || 0) + 1;
      if (config.__retries <= RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[config.__retries - 1]);
        return axiosInstance(config);
      }
    }

    if (status === 401 && config && !AUTH_PROBES.some((p) => config.url?.includes(p))) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// wake the sleeping server as early as possible (fire and forget)
export const warmUpServer = () => {
  fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => {});
};
