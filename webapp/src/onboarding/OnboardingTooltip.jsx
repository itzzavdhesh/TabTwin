import React, { useEffect, useRef } from 'react';

export default function OnboardingTooltip({ title, body, targetSelector, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!ref.current || !target) return;

    const rect = target.getBoundingClientRect();
    const element = ref.current;
    element.style.top = `${Math.max(16, rect.top + window.scrollY + 12)}px`;
    element.style.left = `${Math.max(16, rect.left + window.scrollX)}px`;
    element.style.maxWidth = '280px';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [body, onClose, targetSelector]);

  return (
    <div ref={ref} className="fixed z-[2147483647] rounded-lg border border-slate-200 bg-white p-3 shadow-lg" role="dialog" aria-live="polite">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
      <button className="mt-2 text-sm font-semibold text-teal-700" onClick={onClose} type="button">
        Dismiss
      </button>
    </div>
  );
}
