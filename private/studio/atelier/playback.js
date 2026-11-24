export function createPlaybackController({
 requestFrame = callback => requestAnimationFrame(callback),
 cancelFrame = id => cancelAnimationFrame(id),
 now = () => performance.now()
} = {}) {
 let frame = null;
 let generation = 0;

 function stop() {
  generation++;
  if (frame !== null) cancelFrame(frame);
  frame = null;
 }

 function play(duration, render) {
  stop();
  const current = generation;
  const start = now();
  function tick(timestamp) {
   if (current !== generation) return;
   frame = null;
   const time = Math.min(duration, Math.max(0, timestamp - start));
   render(time);
   if (current === generation && time < duration) frame = requestFrame(tick);
  }
  tick(start);
 }

 return {play, stop};
}
