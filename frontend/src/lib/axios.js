import axios from "axios";

const DEFAULT_PROD_API = "https://tanvir-chatapp-back.onrender.com/api";

// VITE_API_URL (e.g. https://my-api.onrender.com/api) overrides the defaults at build time
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:3000/api" : DEFAULT_PROD_API);

// socket.io connects to the API origin, not to the /api path
export const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || new URL(API_URL).origin;

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});
