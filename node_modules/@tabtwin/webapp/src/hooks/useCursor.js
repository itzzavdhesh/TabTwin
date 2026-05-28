// Tracks guest pointer position and throttles cursor movement sync to the host.
import { useRef, useState } from 'react';

export function useCursor({ onMove }) {
  const lastSent = useRef(0);
  const [position, setPosition] = useState({ x: 120, y: 120 });

  function handlePointerMove(event) {
    const next = { x: event.clientX, y: event.clientY, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight };
    setPosition(next);

    const now = performance.now();
    if (now - lastSent.current > 32) {
      lastSent.current = now;
      onMove(next);
    }
  }

  return { position, handlePointerMove };
}
