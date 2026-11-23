// Reveal the four home tiles in reading order as they enter the viewport.
// A fresh observer is installed on each visit to the home route.
export function initHomeTileReveal(root = document) {
  const grid = root.querySelector('.home-feature-grid');
  if (!grid) return () => {};
  const tiles = [...grid.querySelectorAll('.home-feature-tile')];
  if (!tiles.length) return () => {};

  // Respect the visitor's reduced-motion setting and support older browsers.
  if (document.body.classList.contains('reduced') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined') return () => {};

  let nextReveal = 0;
  const timers = new Set();
  const observer = new IntersectionObserver(entries => {
    const entering = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => tiles.indexOf(a.target) - tiles.indexOf(b.target));
    for (const entry of entering) {
      observer.unobserve(entry.target); // Reveal only once per visit.
      const now = performance.now();
      const start = Math.max(now, nextReveal);
      nextReveal = start + 240;
      const timer = setTimeout(() => {
        entry.target.classList.add('is-revealed');
        timers.delete(timer);
      }, Math.max(0, start - now));
      timers.add(timer);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px 30px 0px' });

  // Until JavaScript initializes, all cards remain visible by default.
  grid.classList.add('is-scroll-animated');
  tiles.forEach(tile => observer.observe(tile));

  return () => {
    observer.disconnect();
    timers.forEach(clearTimeout);
    timers.clear();
    grid.classList.remove('is-scroll-animated');
  };
}
