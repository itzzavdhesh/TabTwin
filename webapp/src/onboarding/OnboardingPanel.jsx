import React from 'react';

export default function OnboardingPanel({ title, body, currentStep, totalSteps, onClose, onNext, onPrevious, onSkip, onFinish, canGoBack, canGoNext }) {
  return (
    <section aria-label="AI onboarding" className="fixed inset-x-4 bottom-4 z-[2147483646] rounded-xl border border-slate-200 bg-white p-4 shadow-xl md:left-auto md:right-4 md:w-[360px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">AI onboarding</p>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        </div>
        <button aria-label="Close onboarding" className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(((currentStep + 1) / Math.max(totalSteps, 1)) * 100)}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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
    </section>
  );
}
