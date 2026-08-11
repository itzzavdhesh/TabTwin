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
    this.playbackCursor = 0;
  }

  load(recording) {
    if (!recording || !Array.isArray(recording.events)) {
      this.recording = null;
      this.events = [];
      this.currentTime = 0;
      this.state = 'stopped';
      this.playbackCursor = 0;
      return;
    }

    this.recording = recording;
    this.events = recording.events
      .slice()
      .sort((left, right) => {
        const leftTime = Number.isFinite(left.relativeTimestamp) ? left.relativeTimestamp : left.timestamp;
        const rightTime = Number.isFinite(right.relativeTimestamp) ? right.relativeTimestamp : right.timestamp;
        return leftTime - rightTime;
      });
    this.currentTime = 0;
    this.state = 'paused';
    this.playbackCursor = 0;
    this.stopTimer();
  }

  play() {
    if (!this.events.length || this.state === 'playing') return;
    this.state = 'playing';
    this.stopTimer();
    this.advance();
  }

  pause() {
    this.state = 'paused';
    this.stopTimer();
    this.notifyProgress();
  }

  resume() {
    if (this.state === 'stopped' || !this.events.length) return;
    this.play();
  }

  seek(milliseconds) {
    const nextTime = Math.max(0, Number(milliseconds) || 0);
    this.currentTime = nextTime;
    this.playbackCursor = this.findCursorIndex(nextTime);
    this.state = 'paused';
    this.stopTimer();
    this.notifyProgress();
  }

  stop() {
    this.state = 'stopped';
    this.currentTime = 0;
    this.playbackCursor = 0;
    this.stopTimer();
    this.notifyProgress();
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

    const nextTime = this.currentTime + 100 / this.playbackSpeed;
    const nextEvent = this.events[this.playbackCursor];

    if (nextEvent && nextEvent.relativeTimestamp <= nextTime) {
      this.currentTime = nextEvent.relativeTimestamp;
      this.renderEvent(nextEvent);
      this.playbackCursor += 1;
      this.notifyProgress();

      if (this.playbackCursor >= this.events.length) {
        this.stop();
        return;
      }

      this.scheduleNext();
      return;
    }

    this.currentTime = nextTime;
    this.notifyProgress();

    if (this.currentTime >= this.getDuration()) {
      this.stop();
      return;
    }

    this.scheduleNext();
  }

  renderEvent(event) {
    if (!this.renderer || !event) return;
    this.renderer(event);
  }

  getDuration() {
    if (!this.events.length) return 0;
    return this.events[this.events.length - 1].relativeTimestamp ?? this.events[this.events.length - 1].timestamp;
  }

  stopTimer() {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  scheduleNext() {
    this.stopTimer();
    this.playbackTimer = setTimeout(() => this.advance(), 100 / this.playbackSpeed);
  }

  notifyProgress() {
    this.onProgress?.(this.currentTime);
  }

  findCursorIndex(time) {
    const targetTime = Math.max(0, Number(time) || 0);
    let index = 0;
    while (index < this.events.length && this.events[index].relativeTimestamp < targetTime) {
      index += 1;
    }
    return Math.max(0, index);
  }
}
