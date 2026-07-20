import React from 'react';

export default function SessionError({ type = 'not-found' }) {
  let title = 'Session Unavailable';
  let message = 'The session link is invalid, has expired, or the host has ended the session.';
  
  if (type === 'network') {
    title = 'Connection Failed';
    message = 'We couldn\'t connect to the session. Please check your network and try again.';
  } else if (type === 'ended') {
    title = 'Session Ended';
    message = 'The host has ended this session. Thanks for joining!';
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-10 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {type === 'network' ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0 9 9 0 0112.728 0zM12 9v2m0 4h.01" />
          )}
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-sm text-base text-slate-600 leading-relaxed">{message}</p>
      
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {type === 'network' && (
          <button 
            onClick={() => window.location.reload()} 
            className="rounded-md bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
          >
            Retry Connection
          </button>
        )}
        <a 
          href="/" 
          className="rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Return Home
        </a>
      </div>
    </main>
  );
}
