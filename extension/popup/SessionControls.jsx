// Displays active session sharing controls in the TabTwin extension popup.
import React, { useState } from 'react';

export default function SessionControls({ session, onEnd }) {
  const [copied, setCopied] = useState(false);
  const [viewerCopied, setViewerCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(session.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function copyViewerLink() {
    if (!session.viewerLink) return;
    await navigator.clipboard.writeText(session.viewerLink);
    setViewerCopied(true);
    setTimeout(() => setViewerCopied(false), 1600);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Active session</h2>
      <div className="mt-3 rounded-md bg-slate-100 p-3 text-xs text-slate-700 break-all">
        {session.link}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
          onClick={copyLink}
          type="button"
        >
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        <button
          className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
          onClick={onEnd}
          type="button"
        >
          End Session
        </button>
      </div>
      {session.viewerLink ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-600">Read-only viewer link</p>
          <div className="mt-2 rounded-md bg-slate-100 p-3 text-xs text-slate-700 break-all">
            {session.viewerLink}
          </div>
          <button
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={copyViewerLink}
            type="button"
          >
            {viewerCopied ? 'Copied' : 'Copy Viewer Link'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
