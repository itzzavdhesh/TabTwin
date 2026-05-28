// Hosts the active guest-side TabTwin session surface and bottom controls.
import React from 'react';
import AnnotationLayer from '../components/AnnotationLayer.jsx';
import ControlBar from '../components/ControlBar.jsx';
import GhostCursor from '../components/GhostCursor.jsx';
import SessionStatus from '../components/SessionStatus.jsx';
import { useCursor } from '../hooks/useCursor.js';
import { useSession } from '../hooks/useSession.js';

export default function Session({ sessionId }) {
  const params = new URLSearchParams(window.location.search);
  const guestName = params.get('name') || 'Guest';
  const session = useSession({ sessionId, guestName });
  const cursor = useCursor({ onMove: session.sendCursorMove });

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100" onPointerMove={cursor.handlePointerMove}>
      <div className="absolute inset-x-0 top-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guest session</p>
            <h1 className="text-xl font-bold text-slate-950">Connected as {guestName}</h1>
          </div>
          <SessionStatus status={session.status} label={session.statusLabel} />
        </div>
      </div>

      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 pt-20 pb-28">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-teal-700">Your actions appear in the host browser</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Move your cursor to show a ghost pointer. Highlight, annotate, scroll, click, and type actions are sent as permissioned requests.
          </p>
          <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
            <Permission label="Highlight" enabled={session.permissions.canHighlight} />
            <Permission label="Click" enabled={session.permissions.canClick} />
            <Permission label="Type" enabled={session.permissions.canType} />
          </div>
        </div>
      </section>

      <GhostCursor x={cursor.position.x} y={cursor.position.y} name={guestName} color={session.guest?.color || '#2563eb'} />
      <AnnotationLayer session={session} />
      <ControlBar session={session} cursor={cursor.position} />
    </main>
  );
}

function Permission({ label, enabled }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-800">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{enabled ? 'Allowed by host' : 'Needs host approval'}</p>
    </div>
  );
}
