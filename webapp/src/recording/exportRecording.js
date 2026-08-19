// Converts between TabTwin's internal recording shape and the portable
// .tabtwin.json event-log format described in the recording feature spec:
// { sessionId, startedAt, events: [{ t, type, userId, ...payload }] }.

export function toTabTwinJson(recording) {
  const events = recording?.events ?? [];
  const startedAt = events.length
    ? events[0].timestamp - (events[0].relativeTimestamp || 0)
    : Date.now();

  return {
    sessionId: recording?.sessionId ?? null,
    startedAt,
    events: events.map((event) => ({
      t: event.relativeTimestamp ?? 0,
      type: event.eventType,
      userId: event.participantId,
      ...event.payload,
    })),
  };
}

export function fromTabTwinJson(data) {
  if (!data || !Array.isArray(data.events)) return null;
  const startedAt = Number.isFinite(data.startedAt) ? data.startedAt : Date.now();

  return {
    sessionId: data.sessionId ?? null,
    events: data.events.map((event, index) => {
      const { t, type, userId, ...payload } = event;
      const relativeTimestamp = Number.isFinite(t) ? t : 0;
      return {
        id: `${type}-${relativeTimestamp}-${userId ?? index}`,
        timestamp: startedAt + relativeTimestamp,
        relativeTimestamp,
        eventType: type,
        participantId: userId,
        payload,
      };
    }),
  };
}

export function downloadRecording(recording) {
  const data = toTabTwinJson(recording);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${data.sessionId || 'tabtwin-session'}-${data.startedAt}.tabtwin.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
