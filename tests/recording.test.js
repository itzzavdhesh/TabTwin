import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionRecorder } from '../webapp/src/recording/SessionRecorder.js';
import { PlaybackEngine } from '../webapp/src/recording/PlaybackEngine.js';

test('SessionRecorder compresses and orders collaboration events', () => {
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();

  recorder.capture({ type: 'cursor:move', payload: { x: 5, y: 8 }, participantId: 'guest-1', timestamp: 1000 });
  recorder.capture({ type: 'cursor:move', payload: { x: 5, y: 8 }, participantId: 'guest-1', timestamp: 1010 });
  recorder.capture({ type: 'cursor:move', payload: { x: 9, y: 8 }, participantId: 'guest-1', timestamp: 1030 });
  recorder.capture({ type: 'scroll', payload: { x: 0, y: 40 }, participantId: 'guest-1', timestamp: 1100 });
  recorder.capture({ type: 'scroll', payload: { x: 0, y: 40 }, participantId: 'guest-1', timestamp: 1120 });
  recorder.capture({ type: 'action:request', payload: { type: 'click', x: 10, y: 20 }, participantId: 'guest-2', timestamp: 1200 });

  recorder.stop();
  const timeline = recorder.exportTimeline();

  assert.equal(timeline.length, 5);
  assert.equal(timeline[0].eventType, 'session:start');
  assert.equal(timeline[1].eventType, 'cursor:move');
  assert.equal(timeline[2].eventType, 'scroll');
  assert.equal(timeline[3].eventType, 'click');
  assert.equal(timeline[4].eventType, 'session:end');
  assert.equal(timeline[0].relativeTimestamp, 0);
  assert.ok(timeline[3].relativeTimestamp >= 0);
});

test('SessionRecorder exports timeline after recording is disabled', () => {
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();
  recorder.capture({ type: 'cursor:move', payload: { x: 1, y: 2 }, participantId: 'guest-1', timestamp: 1000 });
  recorder.stop();

  recorder.enabled = false;
  const timeline = recorder.exportTimeline();

  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].eventType, 'session:start');
  assert.equal(timeline[1].eventType, 'session:end');
});

test('SessionRecorder ignores malformed events without throwing', () => {
  const recorder = new SessionRecorder({ enabled: true });
  recorder.start();

  assert.equal(recorder.capture(null), null);
  assert.equal(recorder.capture(undefined), null);
  assert.equal(recorder.capture({ payload: { x: 1 } }), null);
  const validEvent = recorder.capture({ type: 'cursor:move', payload: { x: 2, y: 3 }, participantId: 'guest-1', timestamp: 1000 });
  assert.ok(validEvent);
  assert.equal(validEvent.eventType, 'cursor:move');
});

test('PlaybackEngine uses relative timestamps and tracks its cursor', () => {
  const engine = new PlaybackEngine();
  const recording = {
    sessionId: 'demo',
    events: [
      { id: 'e1', timestamp: 1000, relativeTimestamp: 0, eventType: 'cursor:move', participantId: 'guest-1', payload: { x: 1, y: 1 } },
      { id: 'e2', timestamp: 1200, relativeTimestamp: 200, eventType: 'scroll', participantId: 'guest-1', payload: { x: 0, y: 12 } }
    ]
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
