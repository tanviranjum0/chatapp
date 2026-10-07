import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme.css";
import "./store/usePrefsStore";
import { installGlobalErrorReporting } from "./lib/reportError";
import { installAudioUnlock } from "./lib/ringtone";
import App from "./App.jsx";
import { BrowserRouter } from "react-router";

installGlobalErrorReporting();
installAudioUnlock(); // first touch anywhere unlocks sound so incoming calls can ring

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
