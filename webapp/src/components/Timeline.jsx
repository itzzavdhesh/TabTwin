import React, { memo, useMemo } from 'react';

function Timeline({ recording }) {
  const events = useMemo(() => recording?.events ?? [], [recording]);

  if (!events.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
        <span className="text-sm text-slate-600">{events.length} events</span>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm" key={event.id}>
            <span className="font-medium text-slate-800">{event.eventType}</span>
            <span className="text-slate-500">{formatTime(event.relativeTimestamp)}</span>
          </div>
        ))}
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

export default memo(Timeline);
