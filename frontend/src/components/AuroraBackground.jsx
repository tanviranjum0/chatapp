// Fixed, GPU-friendly animated backdrop shared by every page.
function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div className="absolute -left-[10%] -top-[15%] size-[55vmax] animate-drift rounded-full bg-brand-600/30 blur-[120px] will-change-transform" />
      <div className="absolute -bottom-[20%] -right-[10%] size-[50vmax] animate-drift-slow rounded-full bg-bloom-500/20 blur-[130px] will-change-transform" />
      <div className="absolute left-[35%] top-[30%] size-[35vmax] animate-drift rounded-full bg-aqua-500/15 blur-[120px] will-change-transform" />
      {/* subtle grid + vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  );
}
export default AuroraBackground;
