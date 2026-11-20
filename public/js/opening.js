export function drawGrid(ctx, images, w, h, time, settings) {
  const {word, tileColor, textColor, tilt, zoomSeconds, fadeSeconds, revealSeconds, spacing} = settings;
  const letters = Array.from(word);
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
  const mobile = w < 680, visibleCols = Math.max(letters.length, mobile ? 7 : 11);
  const gap = Math.min(spacing * (mobile ? 4/9 : 1), w / (visibleCols*3)), maxTilt = tilt * Math.PI / 180;
  const tile = Math.max(1, (w-gap*(visibleCols-1))/visibleCols);
  const height = tile*1.35;
  // Keep a centered row and column, with enough extra tiles to cover the tilted corners.
  const cols = 2*Math.ceil((w+h*Math.sin(Math.abs(maxTilt)))/(2*(tile+gap)))+1+(letters.length%2 ? 0 : 2);
  const rows = 2*Math.ceil((h+w*Math.sin(Math.abs(maxTilt)))/(2*(height+gap)))+1;
  const gridW = cols*(tile+gap)-gap, gridH = rows*(height+gap)-gap;
  const zoomRemaining = 1 - ease(time/zoomSeconds);
  const zoom = 1 + .55*zoomRemaining, reveal = ease((time-revealSeconds)/.85);
  ctx.fillStyle = '#111113'; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(zoomRemaining * maxTilt); ctx.scale(zoom,zoom);
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const id=row*cols+col;
    const letter=col-Math.floor((cols-letters.length)/2);
    const hasLetter=row===Math.floor(rows/2) && letter>=0 && letter<letters.length;
    const phase=(time + ((id*37)%13)*.23 + ((row+col)%2)*1.55)%3.6;
    let photo=ease(phase/fadeSeconds)*(1-ease((phase-1.65)/fadeSeconds));
    if(hasLetter) photo*=1-reveal;
    const x=-gridW/2+col*(tile+gap)+(letters.length%2 ? 0 : (tile+gap)/2), y=-gridH/2+row*(height+gap);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,tile,height,tile*.095); ctx.clip();
    ctx.fillStyle=tileColor;ctx.fillRect(x,y,tile,height);
    ctx.globalAlpha=photo*(hasLetter?1:1-.55*reveal);
    if (images.length) {
      const image = images[(id*7+row*3)%images.length];
      const scale = Math.max(tile/image.naturalWidth,height/image.naturalHeight);
      const width = image.naturalWidth*scale, imageHeight = image.naturalHeight*scale;
      ctx.drawImage(image,x+(tile-width)/2,y+(height-imageHeight)/2,width,imageHeight);
    }
    if(hasLetter && reveal>0) {
      ctx.globalAlpha=reveal;ctx.fillStyle=textColor;
      ctx.font='normal '+(tile*.79)+'px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(letters[letter],x+tile/2,y+height*.53,tile*.94);
    }
    ctx.restore();
  }
  ctx.restore();
}

import { bundledPhotos } from './opening-settings.js';

async function loadPhotos(urls) {
  const images = await Promise.all(urls.map(url => new Promise(resolve => {
    const image = new Image();
    const timeout = setTimeout(() => resolve(null), 3000);
    image.referrerPolicy = 'no-referrer';
    image.src = url;
    image.decode().then(() => resolve(image), () => resolve(null)).finally(() => clearTimeout(timeout));
  })));
  return images.filter(Boolean);
}

export function playOpening(canvas, settings, {reduced = false, onReady = () => {}, onEnd = () => {}} = {}) {
  let frame, stopped = false;
  const stop = () => { stopped = true; cancelAnimationFrame(frame); };
  const sources = settings.photos.length ? settings.photos : bundledPhotos;
  (async () => {
    let images = await loadPhotos(sources);
    if (!images.length && sources !== bundledPhotos && !stopped) images = await loadPhotos(bundledPhotos);
    if (stopped) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) { onEnd(); return; }
    const end = Math.max(settings.zoomSeconds, settings.revealSeconds+2.5);
    const start = performance.now();
    onReady();
    function paint(now) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const scale = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(w*scale), height = Math.round(h*scale);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const elapsed = (now-start)/1000;
      if (w && h) {
        ctx.setTransform(scale,0,0,scale,0,0);
        drawGrid(ctx, images, w, h, reduced ? end : Math.min(elapsed,end), settings);
      }
      if (elapsed >= (reduced ? 1.2 : end)) onEnd();
      else frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
  })();
  return stop;
}
