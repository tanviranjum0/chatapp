// Fixed backdrop shared by every page. Soft radial gradients instead of huge blurred elements:
// `filter: blur(120px)` on full-screen layers was the biggest paint cost on phones.
// Movement only runs on larger screens and uses transforms only (GPU composited).
function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div className="absolute -left-[20%] -top-[25%] size-[80vmax] rounded-full bg-[radial-gradient(circle,rgb(91_91_240/0.32),transparent_62%)] md:animate-drift" />
      <div className="absolute -bottom-[30%] -right-[20%] size-[75vmax] rounded-full bg-[radial-gradient(circle,rgb(217_70_239/0.2),transparent_62%)] md:animate-drift-slow" />
      <div className="absolute left-[25%] top-[20%] hidden size-[55vmax] rounded-full bg-[radial-gradient(circle,rgb(34_184_232/0.14),transparent_62%)] md:block md:animate-drift" />
    </div>
  );
}
export default AuroraBackground;
