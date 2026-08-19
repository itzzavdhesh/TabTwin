// Drives visual playback state (ghost cursor positions, placed annotations)
// from a PlaybackEngine's renderer/reset callbacks, shared between the live
// Session page's in-session playback and the standalone recording Viewer.
import { useCallback, useState } from 'react';

export function usePlaybackReplay() {
  const [cursors, setCursors] = useState({});
  const [annotations, setAnnotations] = useState([]);

  const attach = useCallback((engine) => {
    engine.setOnReset(() => {
      setCursors({});
      setAnnotations([]);
    });

    engine.setRenderer((event) => {
      if (event.eventType === 'cursor:move') {
        setCursors((current) => ({
          ...current,
          [event.participantId]: {
            participantId: event.participantId,
            x: event.payload?.x ?? 0,
            y: event.payload?.y ?? 0,
          },
        }));
        return;
      }

      if (event.eventType === 'annotation:add' && event.payload?.annotation) {
        setAnnotations((current) => [
          ...current,
          { ...event.payload.annotation, participantId: event.participantId },
        ]);
      }
    });
  }, []);

  return { cursors, annotations, attach };
}
