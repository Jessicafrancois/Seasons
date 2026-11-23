import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const location = resolve(import.meta.dirname, '../private/studio/data/opening-draft.json');
const defaults = Object.freeze({
  rotation: 8, tileSize: 64, gap: 4, duration: 900, mode: 'independent',
  solidColor: '#a4a99b', straightenOnZoom: true, fillViewport: true
});
const modes = new Set(['independent', 'sequence', 'wave']);
let sequence = Promise.resolve();
export function draftEnabled() {
  // Local file-based draft persistence is not suitable for serverless production.
  return process.env.NODE_ENV !== 'production' && process.env.STUDIO_LOCAL_DRAFTS === 'true';
}
export function validateDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid draft');
  const result = {};
  for (const [key, min, max] of [['rotation', -20, 20], ['tileSize', 24, 120], ['gap', 0, 20], ['duration', 200, 3000]]) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < min || value[key] > max) throw Error('Invalid ' + key);
    result[key] = value[key];
  }
  if (!modes.has(value.mode)) throw Error('Invalid animation mode');
  if (typeof value.solidColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value.solidColor)) throw Error('Invalid color');
  for (const key of ['straightenOnZoom','fillViewport']) if (typeof value[key] !== 'boolean') throw Error('Invalid ' + key);
  return { ...result, mode: value.mode, solidColor: value.solidColor.toLowerCase(), straightenOnZoom: value.straightenOnZoom, fillViewport: value.fillViewport };
}
export async function readDraft() {
  if (!draftEnabled()) return { enabled: false, draft: defaults, savedAt: null };
  try {
    const stored = JSON.parse(await readFile(location, 'utf8'));
    return { enabled: true, draft: validateDraft(stored.draft), savedAt: stored.savedAt };
  } catch (error) {
    if (error.code === 'ENOENT') return { enabled: true, draft: defaults, savedAt: null };
    throw error;
  }
}
export async function saveDraft(value) {
  if (!draftEnabled()) throw Error('Draft storage not configured');
  const draft = validateDraft(value);
  sequence = sequence.catch(() => {}).then(async () => {
    const savedAt = new Date().toISOString();
    await mkdir(dirname(location), { recursive: true });
    const temporary = location + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, JSON.stringify({ draft, savedAt }, null, 2), { mode: 0o600, flag: 'wx' });
    await rename(temporary, location);
    return { enabled: true, draft, savedAt };
  });
  return sequence;
}
