// Shows a friendly fallback for unknown TabTwin routes.
import React from 'react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Session not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">This link may be expired, mistyped, or ended by the host.</p>
        <a className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/">
          Back to TabTwin
        </a>
      </section>
    </main>
  );
}
