/* Shared upstream ticker, hardened by Pixy: isolate failures and clean up listeners. */
type Tick = (dt: number) => void;
export const pointer = { x: NaN, y: NaN };
const subscribers = new Map<Tick, (error: unknown) => void>();
let frame = 0;
let last = 0;
let unlisten: (() => void) | null = null;

function stop() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
}
function release() {
  if (subscribers.size) return;
  stop();
  unlisten?.();
  unlisten = null;
}
function loop(now: number) {
  frame = 0;
  // Pixy caps visible animation at 30 FPS; speed still controls simulation time only.
  if (last && now - last < 1000 / 30 - 0.5) {
    if (subscribers.size && !document.hidden) frame = requestAnimationFrame(loop);
    release();
    return;
  }
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  for (const [fn, onError] of Array.from(subscribers)) {
    if (!subscribers.has(fn)) continue;
    try { fn(dt); } catch (error) {
      subscribers.delete(fn);
      try { onError(error); } catch { /* Optional visual observers must never crash the page. */ }
    }
  }
  if (subscribers.size && !document.hidden) frame = requestAnimationFrame(loop);
  release();
}
function start() {
  if (frame || typeof document === 'undefined' || document.hidden) return;
  last = 0;
  frame = requestAnimationFrame(loop);
}
function listen() {
  if (unlisten || typeof document === 'undefined') return;
  const away = () => { pointer.x = NaN; pointer.y = NaN; };
  const move = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
  const visibility = () => { if (document.hidden) stop(); else if (subscribers.size) start(); };
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', away);
  window.addEventListener('blur', away);
  document.addEventListener('visibilitychange', visibility);
  unlisten = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerleave', away);
    window.removeEventListener('blur', away);
    document.removeEventListener('visibilitychange', visibility);
    away();
  };
}
export function subscribe(fn: Tick, onError: (error: unknown) => void = () => {}): () => void {
  subscribers.set(fn, onError);
  listen();
  start();
  return () => { subscribers.delete(fn); release(); };
}
