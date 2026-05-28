// Wraps a tiny annotation state bridge and marks the Yjs integration point for TabTwin.
export function createCrdtBridge() {
  const annotations = [];
  const listeners = new Set();

  function applyRemoteUpdate(update) {
    if (update?.annotation) annotations.push(update.annotation);
    for (const listener of listeners) listener(annotations);
  }

  function addAnnotation(annotation) {
    annotations.push(annotation);
    for (const listener of listeners) listener(annotations);
    return { annotation };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // TODO: Replace this bridge with full Yjs document encoding/decoding for multi-peer CRDT sync.
  return { applyRemoteUpdate, addAnnotation, subscribe, annotations };
}
