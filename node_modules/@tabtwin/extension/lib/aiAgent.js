// Calls Claude to convert a host command and tab content into a structured browser action plan.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function runClaudeAgent({ apiKey, command, tabs, permissions }) {
  if (!apiKey) {
    return fallbackPlan(command, tabs);
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      system: [
        'You are TabTwin browser agent planner.',
        'Respond only with JSON in this shape: {"summary":"...","actions":[{"type":"navigate","tabIndex":0},{"type":"read","tabIndex":1},{"type":"click","selector":"#compose-button"},{"type":"type","selector":"#reply-box","text":"drafted reply"}]}.',
        'Do not include markdown fences. Respect permissions and omit disallowed actions.'
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ command, tabs, permissions })
        }
      ]
    })
  });

  if (!response.ok) {
    return fallbackPlan(command, tabs, `Claude API error: ${response.status}`);
  }

  const body = await response.json();
  const text = body.content?.find((part) => part.type === 'text')?.text || '{}';

  try {
    return sanitizePlan(JSON.parse(text), permissions);
  } catch {
    return fallbackPlan(command, tabs, 'Claude returned invalid JSON.');
  }
}

function sanitizePlan(plan, permissions) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  return {
    summary: String(plan.summary || 'Agent plan generated.'),
    actions: actions.filter((action) => {
      if (action.type === 'click') return permissions.click;
      if (action.type === 'type') return permissions.type;
      if (action.type === 'navigate') return permissions.navigate;
      return true;
    })
  };
}

function fallbackPlan(command, tabs, reason = 'No Claude API key configured.') {
  return {
    summary: `${reason} Prepared a read-only plan for: ${command}`,
    actions: tabs.slice(0, 3).map((_tab, index) => ({ type: 'read', tabIndex: index }))
  };
}

// TODO: Add OpenAI as an alternative AI agent provider behind the same action-plan interface.
