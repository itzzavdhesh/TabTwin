export function createDemoRecording() {
  return {
    sessionId: 'demo-session',
    events: [
      { id: '1', timestamp: 1000, relativeTimestamp: 0, eventType: 'cursor:move', participantId: 'guest-1', payload: { x: 40, y: 80 } },
      { id: '2', timestamp: 1400, relativeTimestamp: 400, eventType: 'scroll', participantId: 'guest-1', payload: { x: 0, y: 120 } },
      { id: '3', timestamp: 1800, relativeTimestamp: 800, eventType: 'click', participantId: 'guest-2', payload: { type: 'click', x: 120, y: 240 } }
    ]
  };
}
