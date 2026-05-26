// Manages guest WebSocket session state and CRDT-backed annotations.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useWebRTC } from './useWebRTC.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

const DEFAULT_PERMISSIONS = {
  canHighlight: true,
  canAnnotate: true,
  canScroll: true,
  canClick: false,
  canType: false,
  canNavigate: false
};

export function useSession({ sessionId, guestName }) {
  const socketRef = useRef(null);
  const ydoc = useMemo(() => new Y.Doc(), []);
  const annotations = useMemo(() => ydoc.getArray('annotations'), [ydoc]);
  const [status, setStatus] = useState('connecting');
  const [statusLabel, setStatusLabel] = useState('Connecting...');
  const [guest, setGuest] = useState(null);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const { createOffer, handleSignal, sendData } = useWebRTC({ socketRef, sessionId });

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ event: 'session:join', payload: { sessionId, name: guestName } }));
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.event === 'session:joined') {
        setGuest(message.payload.guest);
        setPermissions(message.payload.permissions || DEFAULT_PERMISSIONS);
        setStatus('connected');
        setStatusLabel('Connected');
        createOffer();
      }

      if (message.event === 'control:revoke') {
        setPermissions((current) => ({ ...current, canClick: false, canType: false, canNavigate: false }));
        setStatusLabel('Control revoked');
      }

      if (message.event === 'error') {
        setStatus('error');
        setStatusLabel(message.payload.message);
      }

      if (message.event?.startsWith('webrtc:')) {
        handleSignal(message);
      }
    });

    socket.addEventListener('close', () => {
      setStatus('offline');
      setStatusLabel('Disconnected');
    });

    return () => socket.close();
  }, [createOffer, guestName, handleSignal, sessionId]);

  function send(event, payload = {}) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ event, payload: { sessionId, ...payload } }));
  }

  function sendCursorMove(position) {
    send('cursor:move', position);
    sendData({ event: 'cursor:move', payload: position });
  }

  function requestAction(action) {
    send('action:request', action);
    sendData({ event: 'action:request', payload: action });
  }

  function addAnnotation(annotation) {
    annotations.push([annotation]);
    send('crdt:update', { annotation });
  }

  function leave() {
    socketRef.current?.close();
    window.location.href = '/';
  }

  return {
    status,
    statusLabel,
    guest,
    permissions,
    ydoc,
    sendCursorMove,
    requestAction,
    addAnnotation,
    leave
  };
}
