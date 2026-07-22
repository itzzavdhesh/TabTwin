// Manages guest WebSocket session state and CRDT-backed annotations.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { useWebRTC } from './useWebRTC.js';
import { SessionRecorder } from '../recording/SessionRecorder.js';
import {
  generateHostKeyPair,
  exportPublicKeyToJWK,
  importPublicKeyFromJWK,
  encodeJWKToBase64,
  decodeBase64ToJWK,
  deriveSharedSecret,
  deriveAESKey,
  wrapEncryptedMessage,
  unwrapEncryptedMessage,
  shouldEncryptEvent
} from '../utils/encryption.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

const DEFAULT_PERMISSIONS = {
  canHighlight: true,
  canAnnotate: true,
  canScroll: true,
  canClick: false,
  canType: false,
  canNavigate: false
};

export function useSession({ sessionId, guestName, recordingEnabled = false }) {
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const keyPairRef = useRef(null);
  const hostPublicKeyRef = useRef(null);
  const aesKeyRef = useRef(null);
  const ydoc = useMemo(() => new Y.Doc(), []);
  const annotations = useMemo(() => ydoc.getArray('annotations'), [ydoc]);
  const [status, setStatus] = useState('connecting');
  const [statusLabel, setStatusLabel] = useState('Connecting...');
  const [guest, setGuest] = useState(null);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [recording, setRecording] = useState(null);
  const [recordingOn, setRecordingOn] = useState(recordingEnabled);
  const { createOffer, handleSignal, sendData } = useWebRTC({ socketRef, sessionId });

  useEffect(() => {
    if (!recorderRef.current) {
      recorderRef.current = new SessionRecorder({ enabled: recordingEnabled, participantId: guestName });
    }

    recorderRef.current.enabled = recordingEnabled;
    recorderRef.current.participantId = guestName;

    if (recordingEnabled) {
      recorderRef.current.start();
      setRecording(null);
    } else {
      recorderRef.current.stop();
      const exported = recorderRef.current.exportTimeline();
      setRecording(exported.length ? { sessionId, events: exported } : null);
    }

    setRecordingOn(recordingEnabled);
  }, [guestName, recordingEnabled, sessionId]);

  useEffect(() => {
    async function initializeEncryption() {
      try {
        // Generate this participant's key pair
        const keyPair = await generateHostKeyPair();
        keyPairRef.current = keyPair;

        // Export and publish public key in URL fragment
        const jwkString = await exportPublicKeyToJWK(keyPair.publicKey);
        const base64PK = encodeJWKToBase64(jwkString);
        window.location.hash = `pk=${base64PK}`;

        // Try to import host's public key from URL if this is a guest session
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const hostPKBase64 = hashParams.get('pk');

        if (hostPKBase64) {
          const hostJWK = decodeBase64ToJWK(hostPKBase64);
          hostPublicKeyRef.current = await importPublicKeyFromJWK(hostJWK);

          // Derive shared secret and AES key
          const sharedSecret = await deriveSharedSecret(hostPublicKeyRef.current, keyPair.privateKey);
          aesKeyRef.current = await deriveAESKey(sharedSecret);
        }
      } catch (err) {
        console.error('Encryption initialization failed:', err);
      }
    }

    initializeEncryption();
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ event: 'session:join', payload: { sessionId, name: guestName } }));
    });

    socket.addEventListener('message', async (event) => {
      let message = JSON.parse(event.data);

      // Decrypt message if it's encrypted
      if (message.type === 'encrypted' && aesKeyRef.current) {
        try {
          message = await unwrapEncryptedMessage(message, aesKeyRef.current);
        } catch (err) {
          console.error('Message decryption failed:', err);
          return;
        }
      }

      if (message.event === 'session:joined') {
        recorderRef.current?.capture({ type: 'participant:joined', payload: { guest: message.payload.guest }, participantId: guestName, timestamp: Date.now() });
        setGuest(message.payload.guest);
        setPermissions(message.payload.permissions || DEFAULT_PERMISSIONS);
        setStatus('connected');
        setStatusLabel('Connected');
        createOffer();
      }

      if (message.event === 'control:revoke') {
        if (message.payload?.reason === 'session-ended') {
          setStatus('ended');
          setStatusLabel('Session ended');
        } else {
          recorderRef.current?.capture({ type: 'permission:changed', payload: { reason: 'control-revoked' }, participantId: guestName, timestamp: Date.now() });
          setPermissions((current) => ({ ...current, canClick: false, canType: false, canNavigate: false }));
          setStatusLabel('Control revoked');
        }
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
      setStatus((prev) => (prev === 'ended' ? prev : 'offline'));
      setStatusLabel((prev) => (prev === 'Session ended' ? prev : 'Disconnected'));
    });

    return () => socket.close();
  }, [createOffer, guestName, handleSignal, sessionId]);

  async function send(event, payload = {}) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    let message = { event, payload: { sessionId, ...payload } };

    // Encrypt message if it should be encrypted and we have an encryption key
    if (shouldEncryptEvent(event) && aesKeyRef.current) {
      try {
        message = await wrapEncryptedMessage(message, aesKeyRef.current);
      } catch (err) {
        console.error('Message encryption failed:', err);
        return;
      }
    }

    socket.send(JSON.stringify(message));
  }

  function captureEvent(type, payload) {
    recorderRef.current?.capture({ type, payload, participantId: guestName, timestamp: Date.now() });
  }

  function sendCursorMove(position) {
    captureEvent('cursor:move', position);
    send('cursor:move', position).catch(err => console.error('Failed to send cursor move:', err));
    sendData({ event: 'cursor:move', payload: position });
  }

  function requestAction(action) {
    captureEvent('action:request', action);
    send('action:request', action).catch(err => console.error('Failed to send action request:', err));
    sendData({ event: 'action:request', payload: action });
  }

  function addAnnotation(annotation) {
    annotations.push([annotation]);
    captureEvent('annotation:add', { annotation });
    send('crdt:update', { annotation }).catch(err => console.error('Failed to send annotation:', err));
  }

  function setRecordingEnabled(enabled) {
    setRecordingOn(enabled);
  }

  function leave() {
    recorderRef.current?.stop();
    const exported = recorderRef.current?.exportTimeline() ?? [];
    setRecording(exported.length ? { sessionId, events: exported } : null);
    socketRef.current?.close();
    window.location.href = '/';
  }

  return {
    status,
    statusLabel,
    guest,
    permissions,
    ydoc,
    recording,
    recordingEnabled: recordingOn,
    setRecordingEnabled,
    sendCursorMove,
    requestAction,
    addAnnotation,
    leave
  };
}
