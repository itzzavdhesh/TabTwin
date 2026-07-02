import React from 'react';

export default function WalkthroughControls({ onPrevious, onNext, onSkip, onFinish, canGoBack, canGoNext }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60" disabled={!canGoBack} onClick={onPrevious} type="button">
        Previous
      </button>
      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={onSkip} type="button">
        Skip
      </button>
      {canGoNext ? (
        <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white" onClick={onNext} type="button">
          Next
        </button>
      ) : (
        <button className="rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white" onClick={onFinish} type="button">
          Finish
        </button>
      )}
    </div>
  );
}
