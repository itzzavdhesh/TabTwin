// Displays active session sharing controls in the TabTwin extension popup.
import React, { useState } from 'react';

export default function SessionControls({ session, onEnd }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(session.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Active session</h2>
      <div className="mt-3 rounded-md bg-slate-100 p-3 text-xs text-slate-700 break-all">{session.link}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white" onClick={copyLink} type="button">
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={onEnd} type="button">
          End Session
        </button>
      </div>
    </section>
  );
}
