// Lists connected TabTwin guests and per-guest control revocation actions.
import React from 'react';

export default function GuestList({ guests = [], onRevoke }) {
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
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2" key={guest.id}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: guest.color }} />
                <span className="text-sm font-medium text-slate-800">{guest.name}</span>
              </div>
              <button className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => onRevoke(guest.id)} type="button">
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Control can be revoked per guest.</p>
    </section>
  );
}
