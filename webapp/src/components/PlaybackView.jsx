// Renders the reconstructed visual state (ghost cursors, placed annotations)
// of a recording being replayed by a PlaybackEngine.
import React from 'react';
import GhostCursor from './GhostCursor.jsx';

const CURSOR_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

function colorFor(participantId) {
  let hash = 0;
  for (let i = 0; i < (participantId || '').length; i++) {
    hash = (hash + participantId.charCodeAt(i)) % CURSOR_COLORS.length;
  }
  return CURSOR_COLORS[hash];
}

export default function PlaybackView({ cursors = {}, annotations = [] }) {
  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <GhostCursor
          color={colorFor(cursor.participantId)}
          key={cursor.participantId}
          name={cursor.participantId}
          x={cursor.x}
          y={cursor.y}
        />
      ))}
      {annotations.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-20 mx-auto flex max-w-3xl flex-col items-end gap-2 px-4">
          {annotations.map((annotation, index) => (
            <div
              className="pointer-events-auto max-w-xs rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow"
              key={index}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                {annotation.participantId}
              </p>
              <p className="mt-0.5">{annotation.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
