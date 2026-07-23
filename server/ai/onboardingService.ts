function createFallbackOnboarding(summary = {}) {
  const title = String(summary.title || 'this page').trim();
  return {
    welcomeMessage: `Welcome! ${title ? `You are viewing ${title}.` : 'You are viewing a new page.'}`,
    pageOverview: 'The page is ready for a quick walkthrough. Focus on the main sections and the primary actions first.',
    importantRegions: [],
    recommendedActions: ['Review the main navigation.', 'Check the primary call to action.', 'Take the next step with confidence.'],
    walkthrough: 'Begin by reviewing the visible navigation and the most important action on the page.'
  };
}

export async function generateOnboardingGuidance({ summary, apiKey }) {
  if (!apiKey) {
    return createFallbackOnboarding(summary);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: 'You are TabTwin onboarding assistant. Return compact JSON with welcomeMessage, pageOverview, importantRegions, recommendedActions, walkthrough. Limit the whole response to about 200 words and avoid sensitive details.',
        messages: [{ role: 'user', content: JSON.stringify(summary) }]
      })
    });

    if (!response.ok) {
      return createFallbackOnboarding(summary);
    }

    const body = await response.json();
    const text = body.content?.find((part) => part.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text);
    return {
      welcomeMessage: String(parsed.welcomeMessage || 'Welcome!'),
      pageOverview: String(parsed.pageOverview || 'This page contains a few key areas to review.'),
      importantRegions: Array.isArray(parsed.importantRegions) ? parsed.importantRegions : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      walkthrough: String(parsed.walkthrough || 'Start by scanning the main navigation and primary action.')
    };
  } catch {
    return createFallbackOnboarding(summary);
  }
}
