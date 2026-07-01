import { isRecordingEvent } from './types.js';

export class SessionRecorder {
  constructor({ enabled = false, participantId = 'host' } = {}) {
    this.enabled = enabled;
    this.participantId = participantId;
    this.isRecording = false;
    this.timeline = [];
    this.sessionStartedAt = null;
    this.lastCursorEvent = null;
  }

  start() {
    if (!this.enabled) return;
    this.isRecording = true;
    this.timeline = [];
    this.sessionStartedAt = Date.now();
    this.lastCursorEvent = null;
    this.capture({ type: 'session:start', payload: { startedAt: this.sessionStartedAt }, participantId: this.participantId, timestamp: this.sessionStartedAt });
  }

  stop() {
    if (!this.isRecording) return;
    this.capture({ type: 'session:end', payload: { endedAt: Date.now() }, participantId: this.participantId, timestamp: Date.now() });
    this.isRecording = false;
  }

  capture(event) {
    if (!this.enabled || !this.isRecording) return null;

    const eventType = event.type || event.eventType || event.event || 'unknown';
    if (!isRecordingEvent(eventType)) return null;

    const normalized = this.normalizeEvent(event, eventType);
    if (!normalized) return null;

    this.timeline.push(normalized);
    this.lastCursorEvent = eventType === 'cursor:move' ? normalized : this.lastCursorEvent;
    return normalized;
  }

  exportTimeline() {
    if (!this.enabled) return [];

    const sortedEvents = this.timeline
      .slice()
      .sort((left, right) => left.timestamp - right.timestamp);

    if (!sortedEvents.length) return [];

    return sortedEvents.map((event, index) => ({
      ...event,
      relativeTimestamp: index === 0 ? 0 : Math.max(0, event.timestamp - sortedEvents[0].timestamp)
    }));
  }

  clear() {
    this.timeline = [];
    this.sessionStartedAt = null;
    this.lastCursorEvent = null;
    this.isRecording = false;
  }

  normalizeEvent(event, eventType) {
    const timestamp = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
    const payload = event.payload ?? {};

    if (eventType === 'cursor:move') {
      if (!payload || typeof payload !== 'object') return null;
      const shouldSkip = this.shouldSkipCursorEvent(payload);
      if (shouldSkip) return null;
      return this.buildEvent(eventType, event.participantId || this.participantId, payload, timestamp);
    }

    if (eventType === 'scroll') {
      const previous = this.timeline[this.timeline.length - 1];
      if (previous?.eventType === 'scroll' && previous.payload?.x === payload?.x && previous.payload?.y === payload?.y) {
        return null;
      }
    }

    if (eventType === 'action:request') {
      const normalizedType = payload?.type === 'click' ? 'click' : eventType;
      return this.buildEvent(normalizedType, event.participantId || this.participantId, payload, timestamp);
    }

    return this.buildEvent(eventType, event.participantId || this.participantId, payload, timestamp);
  }

  shouldSkipCursorEvent(payload) {
    const previous = this.timeline[this.timeline.length - 1];
    const samePosition = previous?.eventType === 'cursor:move' && previous.payload?.x === payload?.x && previous.payload?.y === payload?.y;
    if (samePosition) return true;

    if (!previous) return false;

    const delta = Math.abs((payload?.x ?? 0) - (previous.payload?.x ?? 0)) + Math.abs((payload?.y ?? 0) - (previous.payload?.y ?? 0));
    return delta <= 1;
  }

  buildEvent(eventType, participantId, payload, timestamp) {
    return {
      id: `${eventType}-${timestamp}-${participantId}`,
      timestamp,
      relativeTimestamp: 0,
      eventType,
      participantId,
      payload
    };
  }
}
