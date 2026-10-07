import { Component } from "react";

// last line of defence: a bug in one component shows a friendly screen instead of a blank page
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">😵</div>
        <h1 className="text-xl font-bold text-white">Something broke on this screen</h1>
        <p className="max-w-sm text-sm text-slate-400">
          Your messages are safe. Reloading usually fixes it - if it keeps happening, please let us know.
        </p>
        <div className="flex gap-3">
          <button onClick={() => this.setState({ error: null })} className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="auth-btn !w-auto px-6">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
export default ErrorBoundary;
