export class PlaybackEngine {
  constructor() {
    this.recording = null;
    this.events = [];
    this.state = 'stopped';
    this.currentTime = 0;
    this.playbackSpeed = 1;
    this.playbackTimer = null;
    this.renderer = null;
    this.onProgress = null;
  }

  load(recording) {
    if (!recording || !Array.isArray(recording.events)) {
      this.recording = null;
      this.events = [];
      this.currentTime = 0;
      this.state = 'stopped';
      return;
    }

    this.recording = recording;
    this.events = recording.events.slice().sort((left, right) => left.timestamp - right.timestamp);
    this.currentTime = 0;
    this.state = 'paused';
    this.stopTimer();
  }

  play() {
    if (!this.events.length) return;
    this.state = 'playing';
    this.stopTimer();
    this.playbackTimer = setTimeout(() => this.advance(), 100 / this.playbackSpeed);
  }

  pause() {
    this.state = 'paused';
    this.stopTimer();
  }

  resume() {
    if (this.state === 'stopped' || !this.events.length) return;
    this.play();
  }

  seek(milliseconds) {
    this.currentTime = Math.max(0, Number(milliseconds) || 0);
    this.state = 'paused';
    this.stopTimer();
  }

  stop() {
    this.state = 'stopped';
    this.currentTime = 0;
    this.stopTimer();
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = Math.max(0.5, Number(speed) || 1);
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setOnProgress(callback) {
    this.onProgress = callback;
  }

  advance() {
    if (this.state !== 'playing') return;
    const nextTime = this.currentTime + 100;
    const nextEvent = this.events.find((event) => event.timestamp <= nextTime && event.timestamp >= this.currentTime);
    if (nextEvent) {
      this.currentTime = nextEvent.timestamp;
      this.renderEvent(nextEvent);
    } else {
      this.currentTime = nextTime;
    }

    this.onProgress?.(this.currentTime);

    if (this.currentTime >= this.getDuration()) {
      this.stop();
      return;
    }

    this.playbackTimer = setTimeout(() => this.advance(), 100 / this.playbackSpeed);
  }

  renderEvent(event) {
    if (!this.renderer) return;
    this.renderer(event);
  }

  getDuration() {
    if (!this.events.length) return 0;
    return this.events[this.events.length - 1].timestamp;
  }

  stopTimer() {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }
}
