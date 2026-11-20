import { chapters, defaults, ranges, validateOpening } from './opening-settings.js';
import { playOpening } from './opening.js';

const $ = selector => document.querySelector(selector);
const access = $('#access'), form = $('#settings'), chapter = $('#chapter');
const fields = $('#fields'), replay = $('#replay'), status = $('#status'), canvas = $('canvas');
let key, record, busy, dirty, previewTimer, stop = () => {};

for (const name of chapters) chapter.add(new Option(name[0].toUpperCase()+name.slice(1),name));
for (const [name,[min,max,step]] of Object.entries(ranges)) {
  const field = form.elements.namedItem(name);
  Object.assign(field,{min,max,step});
}

function draft() {
  const values = {};
  for (const name of Object.keys(defaults)) {
    const field = form.elements.namedItem(name);
    values[name] = field.type === 'number' ? field.valueAsNumber : field.value;
  }
  values.photos = values.photos.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  return validateOpening(values);
}

function preview(settings) {
  clearTimeout(previewTimer);
  stop();
  stop = playOpening(canvas,settings,{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
}

async function request(method, body) {
  const response = await fetch('/api/studio/openings/'+chapter.value,{
    method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:body && JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

function setBusy(value) {
  busy = value;
  fields.disabled = value || !record;
  replay.disabled = value || !record;
  chapter.disabled = value;
  $('#reload').disabled = value;
  access.querySelector('button').disabled = value;
}

async function load() {
  clearTimeout(previewTimer);
  setBusy(true);
  status.textContent = 'Loading from Notion…';
  try {
    record = await request('GET');
    for (const [name,value] of Object.entries(record.settings)) {
      form.elements.namedItem(name).value = Array.isArray(value) ? value.join('\n') : value;
    }
    chapter.dataset.loaded = chapter.value;
    dirty = false;
    preview(record.settings);
    status.textContent = 'Loaded from Notion.';
    access.hidden = true;
    form.hidden = false;
  } catch (error) {
    if (record) chapter.value = chapter.dataset.loaded;
    status.textContent = error.message;
  } finally { setBusy(false); }
}

access.onsubmit = event=>{
  event.preventDefault();
  if (busy) return;
  key = $('#key').value;
  $('#key').value = '';
  load();
};
chapter.onchange = ()=>{
  if (dirty && !confirm('Discard unsaved changes to this chapter?')) chapter.value = chapter.dataset.loaded;
  else load();
};
$('#reload').onclick = ()=>{ if (!dirty || confirm('Discard unsaved changes and reload?')) load(); };
form.oninput = event=>{
  if (event.target === chapter) return;
  dirty = true;
  status.textContent = 'Unsaved changes.';
  clearTimeout(previewTimer);
  previewTimer = setTimeout(()=>{
    try { preview(draft()); } catch {}
  },350);
};
replay.onclick = ()=>{
  try { preview(draft()); } catch (error) { status.textContent = error.message; }
};
$('#phone').onclick = event=>{
  event.currentTarget.setAttribute('aria-pressed',canvas.parentElement.classList.toggle('phone'));
  if (record) replay.onclick();
};
form.onsubmit = async event=>{
  event.preventDefault();
  if (busy || !record) return;
  try {
    const settings = draft();
    setBusy(true);
    status.textContent = 'Saving to Notion…';
    record = await request('PUT',{settings,revision:record.revision});
    dirty = false;
    status.textContent = 'Saved to Notion. Visitors will see these settings when they next open this chapter’s intro.';
  } catch (error) { status.textContent = error.message; }
  finally { setBusy(false); }
};
window.addEventListener('beforeunload',event=>{
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
