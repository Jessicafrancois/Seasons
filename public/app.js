const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const duration = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');

function cover(url) {
  const path = new URL(url, location.origin);
  if (!['http:', 'https:'].includes(path.protocol)) return '';
  return `style="--cover: url(&quot;${escape(path.href.replaceAll('"', '%22'))}&quot;)"`;
}

function seasonPage(season, projects) {
  const playlistLink = (name, url) => url
    ? `<a class="outline" href="${escape(url)}">Open in ${name} ↗</a>`
    : `<span class="outline unavailable">${name} · Coming soon</span>`;
  return `
    <section class="hero" id="season" ${cover(season.cover)}>
      <div class="hero-inner">
        <p class="eyebrow"><i></i> Season ${escape(season.number)} <span> / </span> Current season</p>
        <h1>${escape(season.title)}</h1>
        <p class="intro">${escape(season.intro)}</p>
        <p class="description">${escape(season.description)}</p>
        <a class="button" href="${escape(season.cta.href)}">${escape(season.cta.label)} <span>↘</span></a>
      </div>
      <span class="cover-caption">SEASONS / ${escape(season.number)}</span>
    </section>
    <blockquote><span aria-hidden="true">✳</span> “${escape(season.quote)}”</blockquote>
    <section id="projects" class="section">
      <p class="eyebrow">Season ${escape(season.number)}</p>
      <h2>Featured projects</h2>
      <div class="grid">${projects.map(project => `
        <a class="card" href="/projects/${escape(project.slug)}">
          <div class="art ${project.tracks ? 'album' : 'notes'}" ${cover(project.cover)}></div>
          <div class="card-body"><p class="eyebrow">${escape(project.type)}</p><h3>${escape(project.title)}</h3>
          <p>${escape(project.summary)}</p><span class="arrow" aria-hidden="true">↗</span></div>
        </a>`).join('')}</div>
    </section>
    <section id="playlists" class="section playlist">
      <p class="eyebrow">Seasonal playlist</p><h2>${escape(season.playlist.title)}</h2>
      <div class="platforms">${playlistLink('Spotify', season.playlist.spotify)}${playlistLink('Apple Music', season.playlist.appleMusic)}</div>
    </section>`;
}

function trackList(project) {
  return `<section class="track-list"><h2>Track list</h2>
    <p class="eyebrow">${project.tracks.length} tracks · ${duration(project.tracks.reduce((total, track) => total + track.seconds, 0))} listening time</p>
    <ol>${project.tracks.map((track, index) => `
      <li id="track-${index + 1}">
        <button class="play" data-track="${index}" aria-label="Play ${escape(track.title)}" aria-pressed="false">▶</button>
        <span>${escape(track.title)}</span><span class="time">${duration(track.seconds)}</span>
        <details><summary aria-label="Actions for ${escape(track.title)}">⋯</summary>
          <div class="menu">
            ${track.sampling ? '<button data-action="Sample this track">Sample this track</button>' : ''}
            <button data-action="Request a feature">Request a feature</button>
            <button data-action="Commercial use">Commercial use</button>
            <button data-action="Share">Share</button>
          </div>
        </details>
      </li>`).join('')}</ol>
      <p id="track-status" role="status"></p>
  </section>`;
}

function projectPage(season, project) {
  return `<article class="section project-page">
    <a class="back" href="/#projects">← All projects</a>
    <div class="project-intro">
      <div class="art ${project.tracks ? 'album' : 'notes'}" ${cover(project.cover)} role="img" aria-label="Cover for ${escape(project.title)}"></div>
      <div><p class="eyebrow">Season ${escape(season.number)} / ${escape(project.type)}</p>
      <h1>${escape(project.title)}</h1><p class="description">${escape(project.description)}</p></div>
    </div>
    ${project.tracks ? trackList(project) : ''}
  </article>`;
}

function activateTracks(tracks) {
  const player = new Audio();
  const buttons = [...app.querySelectorAll('[data-track]')];
  const status = document.querySelector('#track-status');
  let current = -1;

  function sync() {
    buttons.forEach((button, index) => {
      const playing = current === index && !player.paused;
      button.textContent = playing ? 'Ⅱ' : '▶';
      button.setAttribute('aria-pressed', playing);
      button.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + tracks[index].title);
    });
  }
  ['play', 'pause', 'ended'].forEach(event => player.addEventListener(event, sync));

  buttons.forEach((button, index) => button.addEventListener('click', async () => {
    if (current === index && !player.paused) {
      player.pause();
      return;
    }
    if (current !== index) {
      current = index;
      player.src = tracks[index].file;
    }
    try {
      status.textContent = '';
      await player.play();
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'This preview could not be played.';
    }
  }));

  app.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    button.closest('details').open = false;
    if (button.dataset.action !== 'Share') {
      const index = Number(button.closest('li').querySelector('[data-track]').dataset.track);
      const contact = tracks[index].inquiries?.[button.dataset.action];
      if (contact) location.href = contact;
      else status.textContent = button.dataset.action + ' inquiries are coming soon.';
      return;
    }
    const url = new URL(location.href);
    url.hash = button.closest('li').id;
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = 'Track link copied.';
    } catch {
      status.textContent = url.href;
    }
  }));
}

try {
  const response = await fetch('/content.json');
  if (!response.ok) throw new Error('Content unavailable');
  const { season, projects } = await response.json();
  if (/^#[a-f0-9]{6}$/i.test(season.accent)) document.documentElement.style.setProperty('--accent', season.accent);
  const slug = location.pathname.split('/')[2];
  const project = projects.find(item => item.slug === slug);
  if (location.pathname === '/') app.innerHTML = seasonPage(season, projects);
  else if (project) app.innerHTML = projectPage(season, project);
  else app.innerHTML = '<section class="section"><h1>Project unavailable</h1><a href="/#projects">Browse projects</a></section>';
  document.title = 'Seasons · ' + (project?.title ?? season.title);
  if (project?.tracks) activateTracks(project.tracks);
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
} catch {
  app.textContent = 'Season content is temporarily unavailable.';
}
