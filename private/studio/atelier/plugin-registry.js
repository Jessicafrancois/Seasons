import {plugins, presets, validateMotion} from './motion.js';

export const pluginContractVersion = 1;
const ids = new Set();
export const registry = Object.freeze(plugins.map(manifest => {
 if (!/^[a-z][a-z0-9-]*$/.test(manifest.id) || ids.has(manifest.id) ||
     !/^\d+\.\d+\.\d+$/.test(manifest.version) || !manifest.name || !manifest.description ||
     !manifest.presets.length || manifest.presets.some(id => !Object.hasOwn(presets, id))) {
  throw Error('Invalid Atelier plugin manifest');
 }
 ids.add(manifest.id);
 return Object.freeze({...manifest, presets: Object.freeze([...manifest.presets]),
  contractVersion: pluginContractVersion, capability: 'motion', workspace: 'Canvas'});
}));

export function getPlugin(id) {
 return registry.find(plugin => plugin.id === id);
}

export function pluginSettings(value) {
 if (!value || Object.keys(value).sort().join(',') !== 'duration,enabled' ||
     typeof value.enabled !== 'boolean' || !Number.isInteger(value.duration) ||
     value.duration < 100 || value.duration > 10000) throw Error('Invalid plugin settings');
 return {enabled: value.enabled, duration: value.duration};
}

export function settingsFor(settings, id) {
 return settings[id] || {enabled: true, duration: 800};
}

export function motionPluginFor(motion) {
 const candidates = registry.filter(plugin => plugin.presets.includes(motion.preset));
 return (candidates.find(plugin => plugin.id === 'interactive-motion' && motion.trigger !== 'enter') || candidates[0]).id;
}

export function validatePluginMotion(value, legacy = false) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid plugin motion');
 const {pluginId, ...fields} = value;
 const motion = validateMotion(fields);
 const plugin = getPlugin(pluginId === undefined && legacy ? motionPluginFor(motion) : pluginId);
 if (!plugin?.presets.includes(motion.preset)) throw Error('Invalid motion plugin or preset');
 return {...motion, pluginId: plugin.id};
}
