// Lists connected TabTwin guests and per-guest control revocation actions.
import React from 'react';

export default function GuestList({ guests = [], onRevoke, onPromote }) {
  // TODO: Add sound notification when guest joins.
  // TODO: Show tab favicon in guest list.
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Connected guests</h2>
      <div className="mt-3 space-y-2">
        {guests.length === 0 ? (
          <p className="text-xs text-slate-500">Waiting for a guest to join.</p>
        ) : (
          guests.map((guest) => (
            <div
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              key={guest.id}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: guest.color }} />
                <span className="text-sm font-medium text-slate-800">{guest.name}</span>
                <RoleBadge role={guest.role} />
              </div>
              <div className="flex items-center gap-2">
                {guest.role === 'viewer' && onPromote ? (
                  <button
                    className="rounded-md px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    onClick={() => onPromote(guest.id)}
                    type="button"
                  >
                    Promote
                  </button>
                ) : null}
                <button
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => onRevoke(guest.id)}
                  type="button"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Control can be revoked per guest. Viewers can be promoted to co-host.
      </p>
    </section>
  );
}

function RoleBadge({ role }) {
  if (!role || role === 'guest') return null;
  const isViewer = role === 'viewer';
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isViewer ? 'bg-slate-100 text-slate-600' : 'bg-teal-100 text-teal-700'}`}
    >
      {isViewer ? 'Viewer' : 'Co-host'}
    </span>
  );
}
