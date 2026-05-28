// Creates the guest-side WebRTC data channel used for low-latency TabTwin events.
import { useCallback, useRef } from 'react';

export function useWebRTC({ socketRef, sessionId }) {
  const peerRef = useRef(null);
  const channelRef = useRef(null);

  const sendSignal = useCallback((event, payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ event, payload: { sessionId, ...payload } }));
  }, [sessionId, socketRef]);

  const createOffer = useCallback(async () => {
    if (peerRef.current) return;

    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const channel = peer.createDataChannel('tabtwin-events', { ordered: true });
    peerRef.current = peer;
    channelRef.current = channel;

    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal('webrtc:ice-candidate', { candidate: event.candidate });
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSignal('webrtc:offer', { offer });
  }, [sendSignal]);

  const handleSignal = useCallback(async (message) => {
    const peer = peerRef.current;
    if (!peer) return;

    if (message.event === 'webrtc:answer' && message.payload?.answer) {
      await peer.setRemoteDescription(new RTCSessionDescription(message.payload.answer));
    }

    if (message.event === 'webrtc:ice-candidate' && message.payload?.candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(message.payload.candidate));
    }
  }, []);

  const sendData = useCallback((message) => {
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(JSON.stringify(message));
    }
  }, []);

  // TODO: Add end-to-end encryption for WebRTC data channel payloads.
  return { createOffer, handleSignal, sendData };
}
