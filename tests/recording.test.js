import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionRecorder } from '../webapp/src/recording/SessionRecorder.js';
import { PlaybackEngine } from '../webapp/src/recording/PlaybackEngine.js';
import { toTabTwinJson, fromTabTwinJson } from '../webapp/src/recording/exportRecording.js';

test('SessionRecorder compresses and orders collaboration events', () => {
  const now = Date.now();
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();

  recorder.capture({
    type: 'cursor:move',
    payload: { x: 5, y: 8 },
    participantId: 'guest-1',
    timestamp: now + 10,
  });
  recorder.capture({
    type: 'cursor:move',
    payload: { x: 5, y: 8 },
    participantId: 'guest-1',
    timestamp: now + 20,
  });
  recorder.capture({
    type: 'cursor:move',
    payload: { x: 9, y: 8 },
    participantId: 'guest-1',
    timestamp: now + 30,
  });
  recorder.capture({
    type: 'scroll',
    payload: { x: 0, y: 40 },
    participantId: 'guest-1',
    timestamp: now + 100,
  });
  recorder.capture({
    type: 'scroll',
    payload: { x: 0, y: 40 },
    participantId: 'guest-1',
    timestamp: now + 120,
  });
  recorder.capture({
    type: 'action:request',
    payload: { type: 'click', x: 10, y: 20 },
    participantId: 'guest-2',
    timestamp: now + 200,
  });

  recorder.stop();
  const timeline = recorder.exportTimeline();

  assert.equal(timeline.length, 6);
  assert.equal(timeline[0].eventType, 'session:start');
  assert.equal(timeline[1].eventType, 'cursor:move');
  assert.equal(timeline[2].eventType, 'cursor:move');
  assert.equal(timeline[3].eventType, 'scroll');
  assert.equal(timeline[4].eventType, 'click');
  assert.equal(timeline[5].eventType, 'session:end');
  assert.equal(timeline[0].relativeTimestamp, 0);
  assert.ok(timeline[4].relativeTimestamp >= 0);
});

test('SessionRecorder exports timeline after recording is disabled', () => {
  const now = Date.now();
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();
  recorder.capture({
    type: 'cursor:move',
    payload: { x: 1, y: 2 },
    participantId: 'guest-1',
    timestamp: now + 10,
  });
  recorder.stop();

  recorder.enabled = false;
  const timeline = recorder.exportTimeline();

  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].eventType, 'session:start');
  assert.equal(timeline[1].eventType, 'cursor:move');
  assert.equal(timeline[2].eventType, 'session:end');
});

test('SessionRecorder ignores malformed events without throwing', () => {
  const now = Date.now();
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();

  assert.equal(recorder.capture(null), null);
  assert.equal(recorder.capture(undefined), null);
  assert.equal(recorder.capture({ payload: { x: 1 } }), null);
  const validEvent = recorder.capture({
    type: 'cursor:move',
    payload: { x: 2, y: 3 },
    participantId: 'guest-1',
    timestamp: now + 10,
  });
  assert.ok(validEvent);
  assert.equal(validEvent.eventType, 'cursor:move');
});

test('PlaybackEngine uses relative timestamps and tracks its cursor', () => {
  const engine = new PlaybackEngine();
  const recording = {
    sessionId: 'demo',
    events: [
      {
        id: 'e1',
        timestamp: 1000,
        relativeTimestamp: 0,
        eventType: 'cursor:move',
        participantId: 'guest-1',
        payload: { x: 1, y: 1 },
      },
      {
        id: 'e2',
        timestamp: 1200,
        relativeTimestamp: 200,
        eventType: 'scroll',
        participantId: 'guest-1',
        payload: { x: 0, y: 12 },
      },
    ],
  };

  engine.load(recording);
  engine.setPlaybackSpeed(2.5);
  engine.seek(120);

  assert.equal(engine.playbackSpeed, 2.5);
  assert.equal(engine.currentTime, 120);
  assert.equal(engine.state, 'paused');
  assert.equal(engine.playbackCursor, 1);
  engine.stop();
  assert.equal(engine.state, 'stopped');
  assert.equal(engine.playbackCursor, 0);
});

test('PlaybackEngine.seek() resets and replays every event up to the target timestamp (#70)', () => {
  const engine = new PlaybackEngine();
  const recording = {
    sessionId: 'demo',
    events: [
      {
        id: 'e1',
        timestamp: 1000,
        relativeTimestamp: 0,
        eventType: 'cursor:move',
        participantId: 'guest-1',
        payload: { x: 1, y: 1 },
      },
      {
        id: 'e2',
        timestamp: 1200,
        relativeTimestamp: 200,
        eventType: 'annotation:add',
        participantId: 'guest-1',
        payload: { annotation: { text: 'hi' } },
      },
      {
        id: 'e3',
        timestamp: 1500,
        relativeTimestamp: 500,
        eventType: 'cursor:move',
        participantId: 'guest-1',
        payload: { x: 9, y: 9 },
      },
    ],
  };

  let resetCount = 0;
  const rendered = [];
  engine.load(recording);
  engine.setOnReset(() => {
    resetCount += 1;
    rendered.length = 0;
  });
  engine.setRenderer((event) => rendered.push(event.id));

  // Seeking to 300ms should replay e1 and e2 (both <= 300), but not e3 (500).
  engine.seek(300);
  assert.equal(resetCount, 1, 'seek should reset accumulated visual state exactly once');
  assert.deepEqual(rendered, ['e1', 'e2']);
  assert.equal(engine.playbackCursor, 2);
  assert.equal(engine.currentTime, 300);

  // Seeking backward to 50ms should reset again and replay only e1 — this
  // is the case the old index-jump implementation got wrong, since it
  // never re-ran the renderer for events already "passed".
  engine.seek(50);
  assert.equal(resetCount, 2);
  assert.deepEqual(rendered, ['e1']);
  assert.equal(engine.playbackCursor, 1);
});

test('toTabTwinJson / fromTabTwinJson round-trip a recording without losing event data (#70)', () => {
  const recorder = new SessionRecorder({ enabled: true });
  const now = Date.now();
  recorder.start();
  recorder.capture({
    type: 'cursor:move',
    payload: { x: 10, y: 20 },
    participantId: 'guest-1',
    timestamp: now + 10,
  });
  recorder.capture({
    type: 'annotation:add',
    payload: { annotation: { text: 'See this?' } },
    participantId: 'guest-1',
    timestamp: now + 50,
  });
  recorder.stop();

  const recording = { sessionId: 'sess_abc', events: recorder.exportTimeline() };
  const portable = toTabTwinJson(recording);

  assert.equal(portable.sessionId, 'sess_abc');
  assert.ok(Number.isFinite(portable.startedAt));
  assert.equal(portable.events[0].t, 0);
  assert.equal(portable.events[0].type, 'session:start');
  // All `t` values must be relative to startedAt, i.e. non-negative and monotonic.
  for (let i = 1; i < portable.events.length; i++) {
    assert.ok(portable.events[i].t >= portable.events[i - 1].t);
  }

  const restored = fromTabTwinJson(portable);
  assert.equal(restored.sessionId, 'sess_abc');
  assert.equal(restored.events.length, recording.events.length);
  restored.events.forEach((event, index) => {
    assert.equal(event.eventType, recording.events[index].eventType);
    assert.equal(event.relativeTimestamp, recording.events[index].relativeTimestamp);
    assert.equal(event.participantId, recording.events[index].participantId);
  });
});

test('fromTabTwinJson returns null for a file that is not a valid recording', () => {
  assert.equal(fromTabTwinJson(null), null);
  assert.equal(fromTabTwinJson({}), null);
  assert.equal(fromTabTwinJson({ events: 'not-an-array' }), null);
});
