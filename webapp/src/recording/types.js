export const RECORDING_EVENT_TYPES = new Set([
  'session:start',
  'session:end',
  'participant:joined',
  'participant:left',
  'permission:changed',
  'cursor:move',
  'annotation:add',
  'highlight:add',
  'scroll',
  'action:request',
  'action:approve',
  'typing:approve'
]);

export function isRecordingEvent(eventType) {
  return RECORDING_EVENT_TYPES.has(eventType);
}
