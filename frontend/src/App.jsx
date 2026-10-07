import { Navigate, Route, Routes, useLocation } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import CallOverlay from "./components/CallOverlay";
import { useChatStore } from "./store/useChatStore";
import { useCallStore } from "./store/useCallStore";
import { usePrefsStore } from "./store/usePrefsStore";
import PageLoader from "./components/PageLoader";
import AuroraBackground from "./components/AuroraBackground";
import { AnimatePresence, MotionConfig } from "motion/react";

import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // realtime events (messages, edits, reactions, call signalling) follow the socket
  useEffect(() => {
    if (!socket) return;
    const offChat = useChatStore.getState().bindSocket(socket);
    const offCall = useCallStore.getState().bindSocket(socket);
    return () => {
      offChat();
      offCall();
    };
  }, [socket]);

  return (
    // honours the OS "reduce motion" setting for every animation below
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <AuroraBackground />
      {isCheckingAuth ? (
        <PageLoader />
      ) : (
        <div className="relative flex h-dvh items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
              <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
              <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
            </Routes>
          </AnimatePresence>
        </div>
      )}

      {authUser && <CallOverlay />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--toast-bg)",
            backdropFilter: "blur(12px)",
            color: "var(--toast-fg)",
            border: "1px solid var(--toast-border)",
            borderRadius: "14px",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#06060f" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#06060f" } },
        }}
      />
    </MotionConfig>
  );
}
export default App;
