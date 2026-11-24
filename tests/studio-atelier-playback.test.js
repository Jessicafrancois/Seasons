import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaybackController} from '../private/studio/atelier/playback.js';

test('playback samples a single clock and clamps at the sequence end', () => {
 let next;
 const samples = [];
 const playback = createPlaybackController({
  now: () => 100,
  requestFrame: callback => { next = callback; return 1; },
  cancelFrame: () => {}
 });
 playback.play(75, time => samples.push(time));
 next(125);
 next(200);
 assert.deepEqual(samples, [0, 25, 75]);
});

test('stopped playback ignores stale callbacks and can restart', () => {
 let next;
 const samples = [];
 const cancelled = [];
 const playback = createPlaybackController({
  now: () => 100,
  requestFrame: callback => { next = callback; return 1; },
  cancelFrame: id => cancelled.push(id)
 });
 playback.play(75, time => samples.push(time));
 const stale = next;
 playback.stop();
 playback.play(30, time => samples.push(time));
 stale(115);
 next(130);
 assert.deepEqual(cancelled, [1]);
 assert.deepEqual(samples, [0, 0, 30]);
});
