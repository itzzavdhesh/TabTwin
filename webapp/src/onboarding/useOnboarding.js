import { useEffect, useMemo, useState } from 'react';

export function createOnboardingSteps(guidance = {}) {
  const welcomeMessage = String(guidance.welcomeMessage || 'Welcome!').trim();
  const pageOverview = String(guidance.pageOverview || 'Review the main sections and primary actions on this page.').trim();
  const importantRegions = Array.isArray(guidance.importantRegions) ? guidance.importantRegions : [];
  const recommendedActions = Array.isArray(guidance.recommendedActions) ? guidance.recommendedActions : [];
  const walkthrough = String(guidance.walkthrough || 'Begin by scanning the navigation and the primary action.').trim();

  return [
    {
      id: 'welcome',
      title: 'Welcome',
      body: welcomeMessage || 'Welcome! This page has a quick guided overview ready for you.'
    },
    {
      id: 'overview',
      title: 'Page overview',
      body: pageOverview || 'The page contains a few key regions worth reviewing first.'
    },
    ...importantRegions.slice(0, 3).map((region, index) => ({
      id: `region-${index}`,
      title: 'Highlight',
      body: region
    })),
    {
      id: 'actions',
      title: 'Recommended actions',
      body: recommendedActions.length ? recommendedActions.join(' ') : walkthrough
    }
  ];
}

export function useOnboarding({ enabled = false, guidance = null, onFinish = () => {} }) {
  const [activeStep, setActiveStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const steps = useMemo(() => createOnboardingSteps(guidance || {}), [guidance]);

  useEffect(() => {
    if (!enabled) {
      setActiveStep(0);
      setDismissed(false);
      return;
    }

    setActiveStep(0);
    setDismissed(false);
  }, [enabled]);

  function next() {
    setActiveStep((current) => (current + 1 < steps.length ? current + 1 : current));
  }

  function previous() {
    setActiveStep((current) => (current > 0 ? current - 1 : 0));
  }

  function skip() {
    setDismissed(true);
    onFinish();
  }

  function finish() {
    setDismissed(true);
    onFinish();
  }

  return {
    steps,
    activeStep,
    currentStep: steps[activeStep] || null,
    dismissed,
    next,
    previous,
    skip,
    finish,
    isComplete: dismissed || activeStep >= Math.max(steps.length - 1, 0)
  };
}
