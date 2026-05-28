// Renders the guest bottom control bar for permissioned TabTwin actions.
import React from 'react';

export default function ControlBar({ session, cursor }) {
  function requestAction(type) {
    session.requestAction({ type, x: cursor.x, y: cursor.y });
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2">
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" onClick={() => requestAction('highlight')} type="button">
          Highlight
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" onClick={() => requestAction('scroll')} type="button">
          Scroll
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" onClick={() => requestAction('click')} type="button">
          Request Click
        </button>
        <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => session.leave()} type="button">
          Leave
        </button>
      </div>
    </nav>
  );
}
