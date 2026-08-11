import React, { memo, useMemo } from 'react';

function PlaybackControls({ playback, recording, currentTime, duration }) {
  const formattedTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  if (!recording || !recording.events?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Playback</p>
          <p className="text-sm font-medium text-slate-800">{formattedTime} / {formattedDuration}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => playback.play()} type="button">Play</button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => playback.pause()} type="button">Pause</button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800" onClick={() => playback.resume()} type="button">Resume</button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          className="w-full accent-slate-950"
          max={duration || 0}
          min="0"
          onChange={(event) => playback.seek(Number(event.target.value))}
          type="range"
          value={currentTime}
        />
        <select className="rounded-md border border-slate-300 px-2 py-2 text-sm" onChange={(event) => playback.setPlaybackSpeed(Number(event.target.value))} value={playback.playbackSpeed}>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </div>
  );
}

function formatTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '00:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default memo(PlaybackControls);
