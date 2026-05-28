// Renders a guest ghost cursor preview in the TabTwin web session.
import React from 'react';

export default function GhostCursor({ x, y, name, color = '#2563eb' }) {
  return (
    <div
      className="pointer-events-none fixed z-40 transition-transform duration-75"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      aria-hidden="true"
    >
      <svg width="28" height="30" viewBox="0 0 28 30" fill="none">
        <path d="M4 2L23 16L14 17.5L10.5 26L4 2Z" fill={color} stroke="white" strokeWidth="2" />
      </svg>
      <span className="ml-4 inline-flex rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow">
        {name}
      </span>
    </div>
  );
}
