import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme.css";
import "./store/usePrefsStore";
import { installGlobalErrorReporting } from "./lib/reportError";
import App from "./App.jsx";
import { BrowserRouter } from "react-router";

installGlobalErrorReporting();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
