export const chapters = ['fall', 'winter', 'spring', 'summer'];
export const bundledPhotos = Array.from({ length: 14 }, (_, i) => '/seasons/fall/opening/' + (i+1) + '.jpeg');
export const defaults = {word:'SEASONS',tileColor:'#282628',textColor:'#f2e9d8',tilt:5,zoomSeconds:4.5,fadeSeconds:.55,revealSeconds:3.8,spacing:9,photos:[]};
export const ranges = {
  tilt: [-15,15,.5], zoomSeconds: [.5,12,.1], fadeSeconds: [.2,1.5,.05],
  revealSeconds: [0,12,.1], spacing: [0,24,1]
};

export function validateOpening(values) {
  if (!values || typeof values !== 'object') throw new Error('Opening settings are required.');
  const {word, tileColor, textColor, photos} = values;
  if (typeof word !== 'string' || !word.trim() || Array.from(word).length > 11) throw new Error('Enter a center word of 1–11 characters.');
  for (const color of [tileColor,textColor]) {
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Use six-digit hex colors.');
  }
  const settings = {word:word.trim(), tileColor, textColor};
  for (const [key,[min,max]] of Object.entries(ranges)) {
    const value = values[key];
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(key+' must be between '+min+' and '+max+'.');
    settings[key] = value;
  }
  if (!Array.isArray(photos) || photos.length > 24) throw new Error('Use up to 24 photo URLs.');
  settings.photos = photos.map(photo => {
    if (typeof photo !== 'string' || photo.length > 2000) throw new Error('Photo URLs must be 2,000 characters or fewer.');
    let url;
    try { url = new URL(photo); } catch { throw new Error('Enter one complete HTTPS photo URL per line.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use public HTTPS photo URLs.');
    return url.href;
  });
  return settings;
}
