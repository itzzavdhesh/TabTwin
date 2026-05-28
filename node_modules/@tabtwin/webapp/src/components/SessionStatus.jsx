// Displays connection status for TabTwin session participants.
import React from 'react';

const STYLE_BY_STATUS = {
  connected: 'bg-green-100 text-green-800',
  ready: 'bg-green-100 text-green-800',
  checking: 'bg-amber-100 text-amber-800',
  connecting: 'bg-amber-100 text-amber-800',
  offline: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800'
};

export default function SessionStatus({ status, label }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STYLE_BY_STATUS[status] || 'bg-slate-100 text-slate-700'}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {label || status}
    </div>
  );
}
