// Lets a guest validate and join a TabTwin session from a shared link.
import React, { useEffect, useState } from 'react';
import SessionStatus from '../components/SessionStatus.jsx';
import SessionError from './SessionError.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Join({ sessionId }) {
  // TODO: Add guest name customization before joining with avatars and saved preferences.
  const [name, setName] = useState('');
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('Checking session...');
  const [errorType, setErrorType] = useState(null);

  // A viewer invite link carries `role=viewer&vt=<token>`. The token (not the
  // `role` label) is what the server uses to grant the observe-only role, so
  // it is preserved and forwarded even though the label alone proves nothing.
  const searchParams = new URLSearchParams(window.location.search);
  const requestedRole = searchParams.get('role');
  const viewerToken = searchParams.get('vt');
  const isViewerInvite = requestedRole === 'viewer' && Boolean(viewerToken);

  useEffect(() => {
    fetch(`${API_URL}/api/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('not-found');
          throw new Error('network');
        }
        return res.json();
      })
      .then(() => {
        setStatus('ready');
        setMessage('Session is ready.');
      })
      .catch((err) => {
        setStatus('offline');
        setErrorType(err.message === 'not-found' ? 'not-found' : 'network');
      });
  }, [sessionId]);

  if (status === 'offline') {
    return <SessionError type={errorType} />;
  }

  function joinSession(event) {
    event.preventDefault();
    const guestName = name.trim() || 'Guest';
    const destination = new URLSearchParams({ name: guestName });
    if (isViewerInvite) {
      destination.set('role', 'viewer');
      destination.set('vt', viewerToken);
    }
    window.location.href = `/session/${sessionId}?${destination.toString()}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Join TabTwin</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Enter the shared session</h1>
        {isViewerInvite ? (
          <p className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Read-only viewer invite
          </p>
        ) : null}
        <div className="mt-5">
          <SessionStatus status={status} label={message} />
        </div>
        <form className="mt-6 space-y-4" onSubmit={joinSession}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="guest-name">
            Your name
          </label>
          <input
            id="guest-name"
            className="w-full rounded-md border border-slate-300 px-3 py-3 text-slate-950 outline-none ring-teal-500 focus:ring-2"
            placeholder="Maya"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={status !== 'ready'}
            type="submit"
          >
            Join Session
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Guest profile preferences are coming soon.
        </p>
      </section>
    </main>
  );
}
