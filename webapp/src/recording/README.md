# Recording and playback

The recording subsystem is intentionally isolated from the live collaboration path.

- The recorder only observes supported collaboration events and emits a lightweight timeline.
- Playback uses a dedicated renderer and never sends events over WebRTC or WebSocket.
- Recording is disabled by default and only activates when the host enables it in the session UI.
