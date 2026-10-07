import { Navigate, Route, Routes, useLocation } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import AuroraBackground from "./components/AuroraBackground";
import { AnimatePresence, MotionConfig } from "motion/react";

import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    // honours the OS "reduce motion" setting for every animation below
    <MotionConfig reducedMotion="user">
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

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(17,17,42,.85)",
            backdropFilter: "blur(12px)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,.1)",
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
