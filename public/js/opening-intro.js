import { currentSeason } from './content/index.js';
import { defaults } from './opening-settings.js';
import { playOpening } from './opening.js';

export async function showOpening() {
  if (location.hash && location.hash !== '#/') return;
  const initialHash = location.hash;
  const dialog = document.createElement('dialog');
  dialog.className = 'opening-intro';
  dialog.setAttribute('aria-label','Seasons opening');
  dialog.innerHTML = '<canvas aria-hidden="true"></canvas><button type="button">Skip intro</button>';
  const close = () => dialog.close();
  const hashChange = () => { if (dialog.open) close(); else cleanup(); };
  let stop = () => {};
  const cleanup = () => {
    stop();
    window.removeEventListener('hashchange',hashChange);
    dialog.remove();
  };
  dialog.addEventListener('close',cleanup,{once:true});
  dialog.querySelector('button').onclick = close;
  let settings = defaults;
  try {
    const response = await fetch('/api/openings/'+encodeURIComponent(currentSeason.slug),{signal:AbortSignal.timeout(1800)});
    if (response.ok) settings = (await response.json()).settings;
  } catch {}
  if (location.hash !== initialHash || document.querySelector('dialog[open]')) return;
  document.body.append(dialog);
  window.addEventListener('hashchange',hashChange);
  const reveal = () => {
    if (document.querySelector('dialog[open]')) cleanup();
    else dialog.showModal();
  };
  stop = playOpening(dialog.querySelector('canvas'),settings,{
    reduced:matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduced'),
    onReady:reveal, onEnd:close
  });
}
