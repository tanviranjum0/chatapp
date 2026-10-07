import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { AnimatePresence, MotionConfig } from "motion/react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useCallStore } from "./store/useCallStore";
import { useCallLogStore } from "./store/useCallLogStore";
import { usePrefsStore } from "./store/usePrefsStore";
import { warmUpServer } from "./lib/axios";
import PageLoader from "./components/PageLoader";
import AuroraBackground from "./components/AuroraBackground";
import ConnectionBanner from "./components/ConnectionBanner";
import ErrorBoundary from "./components/ErrorBoundary";

// route and overlay code loads on demand, so the first screen paints sooner
const ChatPage = lazy(() => import("./pages/ChatPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const CallOverlay = lazy(() => import("./components/CallOverlay"));
const ProfilePhotoModal = lazy(() => import("./components/ProfilePhotoModal"));

const BASE_TITLE = "Tanvir's Chatapp";

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const authUser = useAuthStore((s) => s.authUser);
  const socket = useAuthStore((s) => s.socket);
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  const totalUnread = useChatStore((s) => s.chats.reduce((n, c) => n + (c.unreadCount || 0), 0));
  const location = useLocation();

  useEffect(() => {
    warmUpServer(); // the free server sleeps: start waking it while the page is still loading
    checkAuth();
  }, [checkAuth]);

  // realtime events (messages, edits, reactions, call signalling) follow the socket
  useEffect(() => {
    if (!socket) return;
    const offChat = useChatStore.getState().bindSocket(socket);
    const offCall = useCallStore.getState().bindSocket(socket);
    const offLogs = useCallLogStore.getState().bindSocket(socket);
    // load the call history in the background so the "missed calls" badge is right from the start
    useCallLogStore.getState().fetchLogs({ silent: true });
    return () => {
      offChat();
      offCall();
      offLogs();
    };
  }, [socket]);

  // "(3) Tanvir's Chatapp" in the tab, like every messenger
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [totalUnread]);

  return (
    <ErrorBoundary>
      {/* honours the OS "reduce motion" setting for every animation below */}
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
        <AuroraBackground />
        <ConnectionBanner />
        {isCheckingAuth ? (
          <PageLoader />
        ) : (
          <div className="relative flex h-dvh items-center justify-center overflow-hidden">
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
                  <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
                  <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>
        )}

        {authUser && (
          <Suspense fallback={null}>
            <CallOverlay />
            <ProfilePhotoModal />
          </Suspense>
        )}

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
    </ErrorBoundary>
  );
}
export default App;
