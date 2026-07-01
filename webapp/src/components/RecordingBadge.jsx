import React, { memo } from 'react';

function RecordingBadge({ enabled, state }) {
  if (!enabled) return null;

  return (
    <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      {state === 'recording' ? 'Recording active' : 'Playback active'}
    </div>
  );
}

export default memo(RecordingBadge);
