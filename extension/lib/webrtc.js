// Provides host-side WebRTC data channel helpers for TabTwin's low-latency sync.
export function createHostWebRTC({ sendSignal, onDataMessage }) {
  let peer = null;
  let channel = null;

  async function handleOffer(offer, guestId) {
    peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    peer.ondatachannel = (event) => {
      channel = event.channel;
      channel.onmessage = (messageEvent) => {
        try {
          onDataMessage(JSON.parse(messageEvent.data));
        } catch {
          onDataMessage({ event: 'unknown', payload: messageEvent.data });
        }
      };
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal('webrtc:ice-candidate', { guestId, candidate: event.candidate });
    };

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendSignal('webrtc:answer', { guestId, answer });
  }

  async function addIceCandidate(candidate) {
    if (!peer || !candidate) return;
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function sendData(message) {
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(message));
    }
  }

  // TODO: Add end-to-end encryption for WebRTC data channel messages.
  return { handleOffer, addIceCandidate, sendData };
}
